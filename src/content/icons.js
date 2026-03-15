import { Pin, PinOff, X, StickyNote, createElement } from 'lucide';

export function createIcon(iconData, size = 16) {
  return createElement(iconData, {
    width: size,
    height: size,
    'stroke-width': 2,
  });
}

export { Pin, PinOff, X, StickyNote };
