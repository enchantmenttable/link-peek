import { Pin, PinOff, X, createElement } from 'lucide';

export function createIcon(iconData, size = 16) {
  return createElement(iconData, {
    width: size,
    height: size,
    'stroke-width': 2,
  });
}

export { Pin, PinOff, X };
