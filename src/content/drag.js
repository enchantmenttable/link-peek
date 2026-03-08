export function initDrag(titleBar, panel, onDragStart) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  titleBar.addEventListener('mousedown', (e) => {
    // Don't drag if clicking a button
    if (e.target.closest('button')) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    onDragStart();
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    panel.style.left = (startLeft + dx) + 'px';
    panel.style.top = (startTop + dy) + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}
