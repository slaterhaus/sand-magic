import { EMPTY, type ElementId } from '../elements';
import type { Grid } from '../engine/grid';

export interface Controls {
  element: ElementId;
  radius: number;
  paused: boolean;
}

export function paintCircle(
  grid: Grid, cx: number, cy: number, radius: number, id: ElementId,
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius && grid.inBounds(cx + dx, cy + dy)) {
        grid.set(cx + dx, cy + dy, id);
      }
    }
  }
}

export function attachPainting(
  canvas: HTMLCanvasElement, grid: Grid, controls: Controls,
): void {
  let painting = false;
  let erasing = false;
  let last: [number, number] | null = null;

  const toCell = (e: PointerEvent): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [
      Math.floor(((e.clientX - rect.left) / rect.width) * grid.width),
      Math.floor(((e.clientY - rect.top) / rect.height) * grid.height),
    ];
  };

  const stroke = (e: PointerEvent): void => {
    const [x, y] = toCell(e);
    const id = erasing ? EMPTY : controls.element;
    if (last) {
      const [lx, ly] = last;
      const steps = Math.max(Math.abs(x - lx), Math.abs(y - ly), 1);
      for (let s = 0; s <= steps; s++) {
        paintCircle(
          grid,
          Math.round(lx + ((x - lx) * s) / steps),
          Math.round(ly + ((y - ly) * s) / steps),
          controls.radius, id,
        );
      }
    } else {
      paintCircle(grid, x, y, controls.radius, id);
    }
    last = [x, y];
  };

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    painting = true;
    erasing = e.button === 2;
    last = null;
    stroke(e);
  });
  window.addEventListener('pointermove', e => {
    if (painting) stroke(e);
  });
  window.addEventListener('pointerup', () => {
    painting = false;
    last = null;
  });
}
