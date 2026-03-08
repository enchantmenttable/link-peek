const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;
const EDGE_SIZE = 6;

export function initEdgeResize(panel) {
  // Create edge/corner handles
  const edges = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  edges.forEach(dir => {
    const handle = document.createElement('div');
    handle.className = `lp-edge lp-edge-${dir}`;
    handle.dataset.dir = dir;
    panel.appendChild(handle);
  });

  let isResizing = false;
  let dir = '';
  let startX, startY, startWidth, startHeight, startLeft, startTop;

  panel.addEventListener('mousedown', (e) => {
    const edge = e.target.closest('.lp-edge');
    if (!edge) return;

    isResizing = true;
    dir = edge.dataset.dir;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = panel.offsetWidth;
    startHeight = panel.offsetHeight;
    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    if (dir.includes('e')) {
      newWidth = Math.max(MIN_WIDTH, startWidth + dx);
    }
    if (dir.includes('w')) {
      const w = Math.max(MIN_WIDTH, startWidth - dx);
      newLeft = startLeft + (startWidth - w);
      newWidth = w;
    }
    if (dir.includes('s')) {
      newHeight = Math.max(MIN_HEIGHT, startHeight + dy);
    }
    if (dir.includes('n')) {
      const h = Math.max(MIN_HEIGHT, startHeight - dy);
      newTop = startTop + (startHeight - h);
      newHeight = h;
    }

    panel.style.width = newWidth + 'px';
    panel.style.height = newHeight + 'px';
    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
  });

  document.addEventListener('mouseup', () => {
    isResizing = false;
  });
}
