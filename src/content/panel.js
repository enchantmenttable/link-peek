import { panelStyles } from './styles.js';
import { createIcon, Pin, PinOff, X } from './icons.js';
import { initDrag } from './drag.js';
import { initEdgeResize } from './resize.js';
import { MSG } from '../shared/constants.js';

let closeDelay = 250;

export class PeekPanel {
  constructor() {
    this.host = null;
    this.shadow = null;
    this.panel = null;
    this.pinned = false;
    this.closeTimer = null;
    this.onClose = null;
  }

  create(width, height, theme) {
    this._remove();

    this.host = document.createElement('div');
    this.host.className = 'link-peek-host';
    this.shadow = this.host.attachShadow({ mode: 'open' });

    // Apply theme
    this.applyTheme(theme);

    // Inject styles
    const style = document.createElement('style');
    style.textContent = panelStyles;
    this.shadow.appendChild(style);

    // Panel container
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
    this.titleBar.appendChild(this.pinBtn);
    this.titleBar.appendChild(this.closeBtn);

    // Content area
    this.contentArea = document.createElement('div');
    this.contentArea.className = 'lp-content';

    this.panel.appendChild(this.titleBar);
    this.panel.appendChild(this.contentArea);
    this.shadow.appendChild(this.panel);

    document.body.appendChild(this.host);

    // Init drag (auto-pins on drag)
    initDrag(this.titleBar, this.panel, () => {
      this.pin();
      this.showCloseButton();
    });

    // Init edge resize (all edges and corners)
    initEdgeResize(this.panel);

    // Mouse enter/leave for auto-close
    // Listen on both the host (main DOM) and panel (shadow DOM) for reliability
    this.host.addEventListener('mouseenter', () => this.cancelClose());
    this.host.addEventListener('mouseleave', () => this.scheduleClose());
    this.panel.addEventListener('mouseenter', () => this.cancelClose());
    this.panel.addEventListener('mouseleave', () => this.scheduleClose());

    return this;
  }

  applyTheme(theme) {
    if (!this.host) return;

    if (theme === 'dark') {
      this.host.shadowRoot.host.classList.add('dark');
    } else if (theme === 'light') {
      this.host.shadowRoot.host.classList.remove('dark');
    } else {
      // system
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

    // Clamp right edge
    if (left + panelWidth > window.innerWidth - padding) {
      left = window.innerWidth - panelWidth - padding;
    }
    // Clamp left edge
    if (left < padding) {
      left = padding;
    }

    // If panel would go below viewport, show above the link
    if (top + panelHeight > window.innerHeight - padding) {
      top = anchorRect.top - panelHeight - padding;
    }
    // If still out of viewport (very top), just pin to top
    if (top < padding) {
      top = padding;
    }

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

    // Sanitize: parse then strip dangerous elements
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove scripts, event handlers, iframes
    doc.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
      for (const attr of [...el.attributes]) {
        if (attr.name.startsWith('on') || attr.name === 'srcdoc') {
          el.removeAttribute(attr.name);
        }
      }
    });

    this.contentArea.innerHTML = doc.body.innerHTML;

    // Attach link click handlers
    this.contentArea.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = link.href;
        if (!url || url.startsWith('javascript:')) return;

        if (e.metaKey || e.ctrlKey) {
          // Open in background tab
          chrome.runtime.sendMessage({
            type: MSG.OPEN_BACKGROUND_TAB,
            url: url,
          });
        } else {
          // Open in new tab and navigate there
          window.open(url, '_blank');
        }
      });
    });
  }

  togglePin() {
    if (this.pinned) {
      this.unpin();
    } else {
      this.pin();
    }
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
    // Clear any existing timer first to avoid orphaned timers
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

    // If already closing, skip
    if (this.panel?.classList.contains('lp-closing')) return;

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
