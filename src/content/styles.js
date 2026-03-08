export const panelStyles = `
  :host {
    --lp-bg: #ffffff;
    --lp-text: #1a1a1a;
    --lp-text-secondary: #666666;
    --lp-border: #e0e0e0;
    --lp-title-bg: #f5f5f5;
    --lp-hover: #eeeeee;
    --lp-link: #0066cc;
    --lp-scrollbar: #cccccc;
    --lp-scrollbar-hover: #aaaaaa;
    --lp-shadow: rgba(0, 0, 0, 0.15);

    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: var(--lp-text);
  }

  :host(.dark) {
    --lp-bg: #1e1e1e;
    --lp-text: #e0e0e0;
    --lp-text-secondary: #999999;
    --lp-border: #3a3a3a;
    --lp-title-bg: #2a2a2a;
    --lp-hover: #333333;
    --lp-link: #6daaee;
    --lp-scrollbar: #555555;
    --lp-scrollbar-hover: #777777;
    --lp-shadow: rgba(0, 0, 0, 0.4);
  }

  .lp-panel {
    position: fixed;
    z-index: 2147483647;
    background: var(--lp-bg);
    border: 1px solid var(--lp-border);
    border-radius: 8px;
    box-shadow: 0 8px 32px var(--lp-shadow), 0 2px 8px var(--lp-shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: lp-fade-in 0.1s ease-out;
  }

  .lp-panel.lp-closing {
    animation: lp-fade-out 0.08s ease-in forwards;
  }

  .lp-titlebar {
    display: flex;
    align-items: center;
    padding: 6px 8px;
    background: var(--lp-title-bg);
    border-bottom: 1px solid var(--lp-border);
    cursor: grab;
    user-select: none;
    flex-shrink: 0;
    gap: 6px;
    min-height: 32px;
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
  }

  .lp-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: var(--lp-text-secondary);
    padding: 0;
    flex-shrink: 0;
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
  }

  .lp-content h1 { font-size: 1.5em; }
  .lp-content h2 { font-size: 1.3em; }
  .lp-content h3 { font-size: 1.1em; }

  .lp-content p {
    margin: 0.8em 0;
  }

  .lp-content img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }

  .lp-content a {
    color: var(--lp-link);
    text-decoration: underline;
    cursor: pointer;
  }

  .lp-content a:hover {
    opacity: 0.8;
  }

  .lp-content pre {
    background: var(--lp-title-bg);
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 13px;
  }

  .lp-content code {
    background: var(--lp-title-bg);
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 0.9em;
  }

  .lp-content pre code {
    background: none;
    padding: 0;
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

  .lp-content table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.8em 0;
  }

  .lp-content th, .lp-content td {
    border: 1px solid var(--lp-border);
    padding: 6px 10px;
    text-align: left;
  }

  .lp-content th {
    background: var(--lp-title-bg);
    font-weight: 600;
  }

  /* Loading & error states */
  .lp-loading, .lp-error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--lp-text-secondary);
    font-size: 13px;
    padding: 20px;
    text-align: center;
  }

  .lp-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--lp-border);
    border-top-color: var(--lp-link);
    border-radius: 50%;
    animation: lp-spin 0.6s linear infinite;
    margin-right: 8px;
  }

  @keyframes lp-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes lp-fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes lp-fade-out {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(4px); }
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
`;
