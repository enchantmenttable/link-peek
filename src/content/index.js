import { PeekPanel } from './panel.js';
import { extractContent } from './extract.js';
import { getSettings, isSiteDisabled } from '../shared/storage.js';
import { MSG } from '../shared/constants.js';

let hoverTimer = null;
let currentLink = null;
let settings = null;
let modifierDown = false;
let openDelay = 250;

// Track all open panels and which links have panels
const panels = new Set();
const linkToPanelMap = new WeakMap();

// URL cache to avoid re-fetching
const cache = new Map();

async function init() {
  const disabled = await isSiteDisabled(location.hostname);
  if (disabled) return;

  settings = await getSettings();

  document.addEventListener('mouseover', onMouseOver);
  document.addEventListener('mouseout', onMouseOut);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('keydown', onEscape);

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      settings = { ...settings, ...changes.settings.newValue };
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

function onMouseOver(e) {
  // Don't trigger inside our panel
  if (e.target.closest?.('.link-peek-host')) return;

  const link = isValidLink(e.target);
  if (!link) return;

  // Always track which link is hovered (for modifier key trigger later)
  currentLink = link;

  // Check modifier requirement
  if (settings.requireModifier && !modifierDown) return;

  // If this link already has an open panel, cancel its close instead
  const existingPanel = linkToPanelMap.get(link);
  if (existingPanel && existingPanel.isOpen) {
    existingPanel.cancelClose();
    return;
  }

  // Clear any pending hover
  clearHoverTimer();

  // Start delay
  hoverTimer = setTimeout(() => {
    showPanel(link);
  }, openDelay);
}

function onMouseOut(e) {
  const link = isValidLink(e.target);

  // If leaving the current link
  if (link === currentLink) {
    clearHoverTimer();

    // Schedule close on this link's panel if it has one
    const existingPanel = linkToPanelMap.get(link);
    if (existingPanel && existingPanel.isOpen) {
      existingPanel.scheduleClose();
    } else {
      currentLink = null;
    }
  }
}

function onKeyDown(e) {
  if (e.key === 'Meta' || e.key === 'Control') {
    modifierDown = true;

    // If already hovering a link and modifier is now pressed, start timer
    if (settings.requireModifier && currentLink && !linkToPanelMap.has(currentLink)) {
      clearHoverTimer();
      hoverTimer = setTimeout(() => {
        showPanel(currentLink);
      }, openDelay);
    }
  }
}

function onKeyUp(e) {
  if (e.key === 'Meta' || e.key === 'Control') {
    modifierDown = false;
  }
}

function onEscape(e) {
  if (e.key === 'Escape') {
    // Close all unpinned panels, or if all are pinned, close the most recent
    let closedAny = false;
    panels.forEach(p => {
      if (p.isOpen && !p.pinned) {
        p.destroy();
        closedAny = true;
      }
    });
    if (!closedAny) {
      // Close the last opened pinned panel
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

async function showPanel(link) {
  const url = link.href;
  const rect = link.getBoundingClientRect();

  const panel = new PeekPanel();
  panels.add(panel);
  linkToPanelMap.set(link, panel);

  panel.create(settings.defaultWidth, settings.defaultHeight, settings.theme);
  panel.position(rect);
  panel.setLoading();

  // Mouse re-enter on the link should cancel close
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

  // Check cache first
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

    // Panel may have been closed while waiting
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

init();
