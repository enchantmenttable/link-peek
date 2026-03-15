import { panelStyles } from './styles.js';
import { createIcon, Pin, PinOff, X, StickyNote } from './icons.js';
import { initDrag } from './drag.js';
import { initEdgeResize } from './resize.js';
import { getNoteForUrl, saveNoteForUrl, deleteNoteForUrl } from '../shared/storage.js';
import { MSG } from '../shared/constants.js';

let closeDelay = 250;
let activeNotePanel = null; // singleton: only one note panel per page

export function getActiveNotePanel() { return activeNotePanel; }
export function clearActiveNotePanel() { activeNotePanel = null; }

export class PeekPanel {
  constructor() {
    this.host = null;
    this.shadow = null;
    this.panel = null;
    this.pinned = false;
    this.closeTimer = null;
    this.onClose = null;
    this.url = null;
    this._noteSaveFlush = null;
    this._notePanel = null; // reference to a note panel spawned from this panel
    this.onNotePanel = null; // callback when a note panel is created
  }

  create(width, height, theme) {
    this._remove();

    this.host = document.createElement('div');
    this.host.className = 'link-peek-host';
    this.shadow = this.host.attachShadow({ mode: 'open' });

    this.applyTheme(theme);

    const style = document.createElement('style');
    style.textContent = panelStyles;
    this.shadow.appendChild(style);

    this.panel = document.createElement('div');
    this.panel.className = 'lp-panel';
    this.panel.style.width = width + 'px';
    this.panel.style.height = height + 'px';

    // Title bar
    this.titleBar = document.createElement('div');
    this.titleBar.className = 'lp-titlebar';

    this.titleText = document.createElement('span');
    this.titleText.className = 'lp-title';
    this.titleText.textContent = 'Loading...';

    this.noteBtn = document.createElement('button');
    this.noteBtn.className = 'lp-btn lp-note-btn';
    this.noteBtn.title = 'Note for this page';
    this.noteBtn.appendChild(createIcon(StickyNote));
    this.noteBtn.addEventListener('click', () => this._toggleNote());

    this.pinBtn = document.createElement('button');
    this.pinBtn.className = 'lp-btn lp-pin-btn';
    this.pinBtn.title = 'Pin panel';
    this.pinBtn.appendChild(createIcon(Pin));
    this.pinBtn.addEventListener('click', () => this.togglePin());

    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'lp-btn lp-close-btn';
    this.closeBtn.title = 'Close panel';
    this.closeBtn.appendChild(createIcon(X));
    this.closeBtn.addEventListener('click', () => this.destroy());

    this.titleBar.appendChild(this.titleText);
    this.titleBar.appendChild(this.noteBtn);
    this.titleBar.appendChild(this.pinBtn);
    this.titleBar.appendChild(this.closeBtn);

    // Content area
    this.contentArea = document.createElement('div');
    this.contentArea.className = 'lp-content';

    this.panel.appendChild(this.titleBar);
    this.panel.appendChild(this.contentArea);
    this.shadow.appendChild(this.panel);

    document.body.appendChild(this.host);

    initDrag(this.titleBar, this.panel, () => {
      this.pin();
      this.showCloseButton();
    });

    initEdgeResize(this.panel);

    this.host.addEventListener('mouseenter', () => this.cancelClose());
    this.host.addEventListener('mouseleave', () => this.scheduleClose());
    this.panel.addEventListener('mouseenter', () => this.cancelClose());
    this.panel.addEventListener('mouseleave', () => this.scheduleClose());

    return this;
  }

  setUrl(url) {
    this.url = url;
    // Check if a note exists for this URL and tint the icon
    this._refreshNoteIcon();
  }

  async _refreshNoteIcon() {
    const note = await getNoteForUrl(location.href);
    if (note && note.content) {
      this.noteBtn.classList.add('active');
    } else {
      this.noteBtn.classList.remove('active');
    }
  }

  async _toggleNote() {
    // If a note panel is already open anywhere on the page, focus it
    if (activeNotePanel && activeNotePanel.isOpen) {
      // Bring it to attention by briefly shaking or just return
      return;
    }

    // Notes are associated with the current page, not the target link
    const noteUrl = location.href;
    const note = await getNoteForUrl(noteUrl);
    this._openNotePanel(noteUrl, note || { title: document.title || '', content: '' });
  }

  _openNotePanel(noteUrl, note) {
    const notePanel = new PeekPanel();
    this._notePanel = notePanel;
    activeNotePanel = notePanel;

    notePanel.create(
      parseInt(this.panel.style.width),
      parseInt(this.panel.style.height),
      this.host.classList.contains('dark') ? 'dark' : 'light'
    );

    // Position next to this panel, clamped to viewport
    const rect = this.panel.getBoundingClientRect();
    const pw = notePanel.panel.offsetWidth;
    const ph = notePanel.panel.offsetHeight;
    const gap = 8;

    let left = rect.right + gap;
    // If overflows right, try left side
    if (left + pw > window.innerWidth - gap) {
      left = rect.left - pw - gap;
    }
    // Clamp horizontal
    left = Math.max(gap, Math.min(left, window.innerWidth - pw - gap));

    let top = rect.top;
    // Clamp vertical
    top = Math.max(gap, Math.min(top, window.innerHeight - ph - gap));

    notePanel.panel.style.left = left + 'px';
    notePanel.panel.style.top = top + 'px';

    notePanel.pin();
    notePanel.showCloseButton();
    notePanel.noteBtn.style.display = 'none';
    notePanel.titleText.textContent = 'Note';

    const parentPanel = this;
    _setupNoteEditor(notePanel, noteUrl, note, {
      onIconUpdate: (hasNote) => {
        if (hasNote) parentPanel.noteBtn.classList.add('active');
        else parentPanel.noteBtn.classList.remove('active');
      }
    });

    notePanel.onClose = () => {
      this._notePanel = null;
      activeNotePanel = null;
    };

    if (this.onNotePanel) this.onNotePanel(notePanel);
  }

  // Open note directly inside this panel (for Alt+N)
  _openNoteInline(note) {
    activeNotePanel = this;
    _setupNoteEditor(this, this.url, note, null);
  }

  applyTheme(theme) {
    if (!this.host) return;
    if (theme === 'dark') {
      this.host.shadowRoot.host.classList.add('dark');
    } else if (theme === 'light') {
      this.host.shadowRoot.host.classList.remove('dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.host.shadowRoot.host.classList.toggle('dark', isDark);
    }
  }

  position(anchorRect) {
    const padding = 8;
    const panelWidth = this.panel.offsetWidth;
    const panelHeight = this.panel.offsetHeight;

    let left = anchorRect.left;
    let top = anchorRect.bottom + padding;

    if (left + panelWidth > window.innerWidth - padding) {
      left = window.innerWidth - panelWidth - padding;
    }
    if (left < padding) left = padding;
    if (top + panelHeight > window.innerHeight - padding) {
      top = anchorRect.top - panelHeight - padding;
    }
    if (top < padding) top = padding;

    this.panel.style.left = left + 'px';
    this.panel.style.top = top + 'px';
  }

  setLoading() {
    this.contentArea.innerHTML = `
      <div class="lp-loading">
        <div class="lp-spinner"></div>
        Loading preview...
      </div>
    `;
  }

  setError(message) {
    this.contentArea.innerHTML = `
      <div class="lp-error">${escapeHtml(message)}</div>
    `;
  }

  setContent(html, title) {
    this.titleText.textContent = title || 'Untitled';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    doc.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
      for (const attr of [...el.attributes]) {
        if (attr.name.startsWith('on') || attr.name === 'srcdoc') {
          el.removeAttribute(attr.name);
        }
      }
    });

    this.contentArea.innerHTML = doc.body.innerHTML;

    this.contentArea.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = link.href;
        if (!url || url.startsWith('javascript:')) return;
        if (e.metaKey || e.ctrlKey) {
          chrome.runtime.sendMessage({ type: MSG.OPEN_BACKGROUND_TAB, url });
        } else {
          window.open(url, '_blank');
        }
      });
    });
  }

  // --- Pin/Close/Destroy ---

  togglePin() {
    if (this.pinned) this.unpin();
    else this.pin();
  }

  pin() {
    this.pinned = true;
    this.pinBtn.classList.add('active');
    this.pinBtn.innerHTML = '';
    this.pinBtn.appendChild(createIcon(PinOff));
    this.pinBtn.title = 'Unpin panel';
    this.cancelClose();
  }

  unpin() {
    this.pinned = false;
    this.pinBtn.classList.remove('active');
    this.pinBtn.innerHTML = '';
    this.pinBtn.appendChild(createIcon(Pin));
    this.pinBtn.title = 'Pin panel';
  }

  showCloseButton() {
    this.closeBtn.classList.add('visible');
  }

  scheduleClose() {
    if (this.pinned) return;
    this.cancelClose();
    this.closeTimer = setTimeout(() => this.destroy(), closeDelay);
  }

  cancelClose() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  destroy() {
    this.cancelClose();
    if (!this.host) return;
    if (this.panel?.classList.contains('lp-closing')) return;

    // Flush note save if pending
    const flushPromise = this._noteSaveFlush ? this._noteSaveFlush() : null;
    this._noteSaveFlush = null;

    // Detach the note panel so it stays open independently
    if (this._notePanel && this._notePanel.isOpen) {
      this._notePanel = null;
    }

    if (this.panel) {
      this.panel.classList.add('lp-closing');
      this.panel.addEventListener('animationend', () => this._remove(), { once: true });
    } else {
      this._remove();
    }
  }

  _remove() {
    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }
    this.host = null;
    this.shadow = null;
    this.panel = null;
    this.pinned = false;
    if (this.onClose) this.onClose();
  }

  get isOpen() {
    return this.host !== null;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Shared note editor setup — used by both _openNotePanel and _openNoteInline
function _setupNoteEditor(panel, url, note, callbacks) {
  const initialTitle = note?.title || '';
  const initialContent = note?.content || '';
  const hadExistingNote = !!(initialTitle || initialContent);

  panel.contentArea.innerHTML = '';
  panel.contentArea.style.padding = '12px 16px';

  const editor = document.createElement('div');
  editor.className = 'lp-note-editor';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'lp-note-title';
  titleInput.placeholder = 'Note title...';
  titleInput.value = initialTitle;

  const textarea = document.createElement('textarea');
  textarea.className = 'lp-note-content';
  textarea.placeholder = 'Write your note...';
  textarea.value = initialContent;

  const urlLine = document.createElement('div');
  urlLine.className = 'lp-note-url';
  urlLine.textContent = url;

  editor.appendChild(urlLine);
  editor.appendChild(titleInput);
  editor.appendChild(textarea);
  panel.contentArea.appendChild(editor);

  let saveTimer = null;

  const doSave = async () => {
    const title = titleInput.value;
    const content = textarea.value;
    if (title || content) {
      await saveNoteForUrl(url, { title, content });
      if (callbacks?.onIconUpdate) callbacks.onIconUpdate(true);
    }
  };

  const onInput = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 1000);
  };

  titleInput.addEventListener('input', onInput);
  textarea.addEventListener('input', onInput);

  panel._noteSaveFlush = async () => {
    clearTimeout(saveTimer);
    const title = titleInput.value;
    const content = textarea.value;

    if (title || content) {
      await saveNoteForUrl(url, { title, content });
      if (callbacks?.onIconUpdate) callbacks.onIconUpdate(true);
    } else if (hadExistingNote) {
      // Had a note but everything was cleared — delete
      await deleteNoteForUrl(url);
      if (callbacks?.onIconUpdate) callbacks.onIconUpdate(false);
    }
  };

  setTimeout(() => textarea.focus(), 50);
}
