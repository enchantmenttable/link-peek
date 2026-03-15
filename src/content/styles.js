export const panelStyles = `
  :host {
    --lp-bg: #ffffff;
    --lp-text: #1a1a1a;
    --lp-text-secondary: #888888;
    --lp-border: #ebebeb;
    --lp-title-bg: #f8f8f8;
    --lp-hover: #f0f0f0;
    --lp-link: #3b82f6;
    --lp-scrollbar: #d4d4d4;
    --lp-scrollbar-hover: #aaaaaa;
    --lp-shadow: rgba(0, 0, 0, 0.08);
    --lp-shadow-heavy: rgba(0, 0, 0, 0.12);

    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: var(--lp-text);
  }

  :host(.dark) {
    --lp-bg: #1a1a1a;
    --lp-text: #e0e0e0;
    --lp-text-secondary: #777777;
    --lp-border: #2a2a2a;
    --lp-title-bg: #202020;
    --lp-hover: #2a2a2a;
    --lp-link: #6daaee;
    --lp-scrollbar: #444444;
    --lp-scrollbar-hover: #666666;
    --lp-shadow: rgba(0, 0, 0, 0.3);
    --lp-shadow-heavy: rgba(0, 0, 0, 0.5);
  }

  .lp-panel {
    position: fixed;
    z-index: 2147483647;
    background: var(--lp-bg);
    border: 1px solid var(--lp-border);
    border-radius: 10px;
    box-shadow: 0 8px 40px var(--lp-shadow-heavy), 0 1px 4px var(--lp-shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: lp-fade-in 0.12s ease-out;
  }

  .lp-panel.lp-closing {
    animation: lp-fade-out 0.08s ease-in forwards;
  }

  .lp-titlebar {
    display: flex;
    align-items: center;
    padding: 0 10px;
    background: var(--lp-title-bg);
    border-bottom: 1px solid var(--lp-border);
    cursor: grab;
    user-select: none;
    flex-shrink: 0;
    gap: 6px;
    height: 36px;
  }

  .lp-titlebar:active {
    cursor: grabbing;
  }

  .lp-title {
    flex: 1;
    font-size: 12px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--lp-text);
    letter-spacing: -0.01em;
  }

  .lp-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 5px;
    cursor: pointer;
    color: var(--lp-text-secondary);
    padding: 0;
    flex-shrink: 0;
    transition: all 0.1s ease;
  }

  .lp-btn:hover {
    background: var(--lp-hover);
    color: var(--lp-text);
  }

  .lp-btn.active {
    color: var(--lp-link);
  }

  .lp-close-btn {
    display: none;
  }

  .lp-close-btn.visible {
    display: flex;
  }

  .lp-content {
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 16px 20px;
    min-height: 0;
  }

  .lp-content::-webkit-scrollbar {
    width: 6px;
  }

  .lp-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .lp-content::-webkit-scrollbar-thumb {
    background: var(--lp-scrollbar);
    border-radius: 3px;
  }

  .lp-content::-webkit-scrollbar-thumb:hover {
    background: var(--lp-scrollbar-hover);
  }

  /* Content typography */
  .lp-content h1, .lp-content h2, .lp-content h3,
  .lp-content h4, .lp-content h5, .lp-content h6 {
    margin: 1em 0 0.5em;
    line-height: 1.3;
    color: var(--lp-text);
    letter-spacing: -0.01em;
  }

  .lp-content h1 { font-size: 1.4em; font-weight: 700; }
  .lp-content h2 { font-size: 1.2em; font-weight: 700; }
  .lp-content h3 { font-size: 1.05em; font-weight: 600; }

  .lp-content p {
    margin: 0.75em 0;
    line-height: 1.65;
  }

  .lp-content img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
  }

  .lp-content a {
    color: var(--lp-link);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.1s;
    cursor: pointer;
  }

  .lp-content a:hover {
    border-bottom-color: var(--lp-link);
  }

  .lp-content pre {
    background: var(--lp-title-bg);
    padding: 12px 14px;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 13px;
    border: 1px solid var(--lp-border);
  }

  .lp-content code {
    background: var(--lp-title-bg);
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 0.9em;
  }

  .lp-content pre code {
    background: none;
    padding: 0;
    border-radius: 0;
  }

  .lp-content blockquote {
    border-left: 3px solid var(--lp-border);
    margin: 0.8em 0;
    padding: 0.4em 0 0.4em 16px;
    color: var(--lp-text-secondary);
  }

  .lp-content ul, .lp-content ol {
    padding-left: 24px;
    margin: 0.8em 0;
  }

  .lp-content li {
    margin: 0.2em 0;
  }

  .lp-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.8em 0;
  }

  .lp-content th, .lp-content td {
    border: 1px solid var(--lp-border);
    padding: 7px 12px;
    text-align: left;
    font-size: 13px;
  }

  .lp-content th {
    background: var(--lp-title-bg);
    font-weight: 600;
  }

  /* Loading & error states */
  .lp-loading, .lp-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--lp-text-secondary);
    font-size: 13px;
    padding: 20px;
    text-align: center;
    gap: 12px;
  }

  .lp-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--lp-border);
    border-top-color: var(--lp-link);
    border-radius: 50%;
    animation: lp-spin 0.6s linear infinite;
  }

  @keyframes lp-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes lp-fade-in {
    from { opacity: 0; transform: translateY(4px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes lp-fade-out {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(4px) scale(0.98); }
  }

  /* Edge resize handles */
  .lp-edge {
    position: absolute;
  }

  .lp-edge-n {
    top: -3px; left: 6px; right: 6px; height: 6px;
    cursor: n-resize;
  }

  .lp-edge-s {
    bottom: -3px; left: 6px; right: 6px; height: 6px;
    cursor: s-resize;
  }

  .lp-edge-e {
    right: -3px; top: 6px; bottom: 6px; width: 6px;
    cursor: e-resize;
  }

  .lp-edge-w {
    left: -3px; top: 6px; bottom: 6px; width: 6px;
    cursor: w-resize;
  }

  .lp-edge-ne {
    top: -3px; right: -3px; width: 12px; height: 12px;
    cursor: ne-resize;
  }

  .lp-edge-nw {
    top: -3px; left: -3px; width: 12px; height: 12px;
    cursor: nw-resize;
  }

  .lp-edge-se {
    bottom: -3px; right: -3px; width: 12px; height: 12px;
    cursor: se-resize;
  }

  .lp-edge-sw {
    bottom: -3px; left: -3px; width: 12px; height: 12px;
    cursor: sw-resize;
  }

  /* Note editor */
  .lp-note-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 8px;
  }

  .lp-note-url {
    font-size: 11px;
    color: var(--lp-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .lp-note-title {
    width: 100%;
    padding: 4px 0;
    border: none;
    border-bottom: 1px solid var(--lp-border);
    background: transparent;
    color: var(--lp-text);
    font-size: 16px;
    font-weight: 600;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
  }

  .lp-note-title:focus {
    border-color: var(--lp-link);
  }

  .lp-note-content {
    flex: 1;
    width: 100%;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--lp-text);
    font-size: 14px;
    font-family: inherit;
    line-height: 1.6;
    resize: none;
    outline: none;
  }
`;
