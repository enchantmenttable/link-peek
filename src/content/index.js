import { PeekPanel, getActiveNotePanel, clearActiveNotePanel } from './panel.js';
import { extractContent } from './extract.js';
import { getSettings, isSiteDisabled, getNoteForUrl } from '../shared/storage.js';
import { MSG, STORAGE_KEYS } from '../shared/constants.js';

let hoverTimer = null;
let currentLink = null;
let settings = null;
let altDown = false;
let openDelay = 250;
let longPressTimer = null;
let longPressDelay = 500;
let enabled = false;

// Track all open panels and which links have panels
const panels = new Set();
const linkToPanelMap = new WeakMap();

// URL cache to avoid re-fetching
const cache = new Map();

async function init() {
  settings = await getSettings();

  const disabled = await isSiteDisabled(location.hostname);
  if (!disabled) enable();

  // Listen for disabled-sites changes to enable/disable live
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.DISABLED_SITES]) {
      const sites = changes[STORAGE_KEYS.DISABLED_SITES].newValue || [];
      if (sites.includes(location.hostname)) {
        disable();
      } else {
        enable();
      }
    }
    if (changes[STORAGE_KEYS.SETTINGS]) {
      const prev = settings;
      settings = { ...settings, ...changes[STORAGE_KEYS.SETTINGS].newValue };
      if (settings.theme !== prev.theme) {
        panels.forEach(p => {
          if (p.isOpen) p.applyTheme(settings.theme);
          if (p._notePanel && p._notePanel.isOpen) p._notePanel.applyTheme(settings.theme);
        });
      }
    }
  });

  // Listen for messages from background (context menu, keyboard shortcut)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MSG.OPEN_PEEK_PANEL && message.url) {
      openPanelForUrl(message.url);
    }
    if (message.type === MSG.OPEN_PAGE_NOTE) {
      openPageNote();
    }
  });

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settings.theme === 'system') {
      panels.forEach(p => {
        if (p.isOpen) p.applyTheme('system');
      });
    }
  });
}

function enable() {
  if (enabled) return;
  enabled = true;

  document.addEventListener('mouseover', onMouseOver);
  document.addEventListener('mouseout', onMouseOut);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('keydown', onEscape);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mousemove', onMouseMoveForLongPress);
}

function disable() {
  if (!enabled) return;
  enabled = false;

  document.removeEventListener('mouseover', onMouseOver);
  document.removeEventListener('mouseout', onMouseOut);
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  document.removeEventListener('keydown', onEscape);
  document.removeEventListener('mousedown', onMouseDown);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('mousemove', onMouseMoveForLongPress);

  // Close all open panels
  panels.forEach(p => { if (p.isOpen) p.destroy(); });
  clearHoverTimer();
  clearLongPressTimer();
  altDown = false;
  currentLink = null;
}

function isValidLink(el) {
  const link = el.closest('a[href]');
  if (!link) return null;

  const href = link.href;
  if (!href) return null;
  if (href.startsWith('javascript:')) return null;
  if (href.startsWith('mailto:')) return null;
  if (href.startsWith('tel:')) return null;

  // Skip same-page anchors
  const url = new URL(href, location.href);
  if (url.origin === location.origin && url.pathname === location.pathname && url.hash) {
    return null;
  }

  return link;
}

// --- Alt + Hover mode ---

function onMouseOver(e) {
  if (e.target.closest?.('.link-peek-host')) return;

  const link = isValidLink(e.target);
  if (!link) return;

  currentLink = link;

  // Only trigger on hover in altHover mode when Alt is held
  if (settings.triggerMode !== 'altHover' || !altDown) return;

  const existingPanel = linkToPanelMap.get(link);
  if (existingPanel && existingPanel.isOpen) {
    existingPanel.cancelClose();
    return;
  }

  clearHoverTimer();
  hoverTimer = setTimeout(() => {
    showPanel(link);
  }, openDelay);
}

function onMouseOut(e) {
  const link = isValidLink(e.target);

  if (link === currentLink) {
    clearHoverTimer();

    const existingPanel = linkToPanelMap.get(link);
    if (existingPanel && existingPanel.isOpen) {
      existingPanel.scheduleClose();
    } else {
      currentLink = null;
    }
  }
}

function onKeyDown(e) {
  if (e.key === 'Alt') {
    altDown = true;

    // In altHover mode, if already hovering a link, start timer
    if (settings.triggerMode === 'altHover' && currentLink && !linkToPanelMap.has(currentLink)) {
      clearHoverTimer();
      hoverTimer = setTimeout(() => {
        showPanel(currentLink);
      }, openDelay);
    }
  }
}

function onKeyUp(e) {
  if (e.key === 'Alt') {
    altDown = false;
  }
}

// --- Long Press mode ---

let longPressLink = null;

function onMouseDown(e) {
  if (settings.triggerMode !== 'longPress') return;
  if (e.button !== 0) return; // left click only

  const link = isValidLink(e.target);
  if (!link) return;

  const existingPanel = linkToPanelMap.get(link);
  if (existingPanel && existingPanel.isOpen) return;

  longPressLink = link;
  clearLongPressTimer();
  longPressTimer = setTimeout(() => {
    // Prevent the click from navigating
    link.addEventListener('click', preventClick, { once: true, capture: true });
    showPanel(link);
    longPressLink = null;
  }, longPressDelay);
}

function onMouseUp() {
  clearLongPressTimer();
  longPressLink = null;
}

function onMouseMoveForLongPress() {
  // Cancel long press if mouse moves too much
  if (!longPressLink) return;
  clearLongPressTimer();
  longPressLink = null;
}

function preventClick(e) {
  e.preventDefault();
  e.stopPropagation();
}

function clearLongPressTimer() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

// --- Escape ---

function onEscape(e) {
  if (e.key === 'Escape') {
    let closedAny = false;
    panels.forEach(p => {
      if (p.isOpen && !p.pinned) {
        p.destroy();
        closedAny = true;
      }
    });
    if (!closedAny) {
      const arr = [...panels];
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].isOpen) {
          arr[i].destroy();
          break;
        }
      }
    }
  }
}

function clearHoverTimer() {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
}

function trackNotePanels(panel) {
  panel.onNotePanel = (notePanel) => {
    panels.add(notePanel);
    const origOnClose = notePanel.onClose;
    notePanel.onClose = () => {
      panels.delete(notePanel);
      if (origOnClose) origOnClose();
    };
  };
}

// --- Open panel for a URL (used by context menu) ---

async function openPanelForUrl(url) {
  const panel = new PeekPanel();
  panels.add(panel);

  panel.create(settings.defaultWidth, settings.defaultHeight, settings.theme);
  panel.setUrl(url);
  trackNotePanels(panel);

  // Center it
  const w = panel.panel.offsetWidth;
  const h = panel.panel.offsetHeight;
  panel.panel.style.left = Math.max(8, (window.innerWidth - w) / 2) + 'px';
  panel.panel.style.top = Math.max(8, (window.innerHeight - h) / 2) + 'px';

  panel.pin();
  panel.showCloseButton();
  panel.setLoading();

  panel.onClose = () => {
    panels.delete(panel);
  };

  try {
    let result;
    if (cache.has(url)) {
      result = cache.get(url);
    } else {
      const response = await chrome.runtime.sendMessage({ type: MSG.FETCH_URL, url });
      if (!panel.isOpen) return;
      if (!response || !response.success) {
        panel.setError(response?.error || 'Failed to load preview');
        return;
      }
      result = extractContent(response.html, url);
      cache.set(url, result);
    }
    panel.setContent(result.content, result.title);
  } catch {
    if (panel.isOpen) panel.setError('Failed to load preview');
  }
}

// --- Show panel (from hover/longpress on a link element) ---

async function showPanel(link) {
  const url = link.href;
  const rect = link.getBoundingClientRect();

  const panel = new PeekPanel();
  panels.add(panel);
  linkToPanelMap.set(link, panel);

  panel.create(settings.defaultWidth, settings.defaultHeight, settings.theme);
  panel.setUrl(url);
  trackNotePanels(panel);
  panel.position(rect);
  panel.setLoading();

  const linkEnterHandler = () => panel.cancelClose();
  const linkLeaveHandler = () => {
    if (panel.isOpen) panel.scheduleClose();
  };
  link.addEventListener('mouseenter', linkEnterHandler);
  link.addEventListener('mouseleave', linkLeaveHandler);

  panel.onClose = () => {
    link.removeEventListener('mouseenter', linkEnterHandler);
    link.removeEventListener('mouseleave', linkLeaveHandler);
    panels.delete(panel);
    linkToPanelMap.delete(link);
    if (currentLink === link) currentLink = null;
  };

  if (cache.has(url)) {
    const cached = cache.get(url);
    panel.setContent(cached.content, cached.title);
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: MSG.FETCH_URL,
      url: url,
    });

    if (!panel.isOpen) return;

    if (!response || !response.success) {
      panel.setError(response?.error || 'Failed to load preview');
      return;
    }

    const result = extractContent(response.html, url);
    cache.set(url, result);
    panel.setContent(result.content, result.title);
  } catch (err) {
    if (panel.isOpen) {
      panel.setError('Failed to load preview');
    }
  }
}

// --- Page note (Alt+N) ---

let pageNotePanel = null;

async function openPageNote() {
  // If any note panel is already open (from peek panel or Alt+N), don't open another
  const existing = getActiveNotePanel();
  if (existing && existing.isOpen) return;
  if (pageNotePanel && pageNotePanel.isOpen) return;

  const url = location.href;
  const panel = new PeekPanel();
  panels.add(panel);
  pageNotePanel = panel;

  panel.create(settings.defaultWidth, settings.defaultHeight, settings.theme);
  panel.setUrl(url);
  panel.noteBtn.style.display = 'none';

  const w = panel.panel.offsetWidth;
  const h = panel.panel.offsetHeight;
  panel.panel.style.left = Math.max(8, (window.innerWidth - w) / 2) + 'px';
  panel.panel.style.top = Math.max(8, (window.innerHeight - h) / 2) + 'px';

  panel.pin();
  panel.showCloseButton();
  panel.titleText.textContent = 'Note';

  panel.onClose = () => {
    panels.delete(panel);
    pageNotePanel = null;
    clearActiveNotePanel();
  };

  const note = await getNoteForUrl(url);
  panel._openNoteInline(note || { title: document.title, content: '' });
}

init();
