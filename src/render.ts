import { ELEMENTS } from './elements';
import type { Grid } from './engine/grid';

export const SCALE = 3;

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// palette[elementId] = flat [r,g,b, r,g,b, ...] for each color variant
export function buildPalette(): Uint8Array[] {
  const palette: Uint8Array[] = [];
  for (const def of Object.values(ELEMENTS)) {
    const arr = new Uint8Array(def.colors.length * 3);
    def.colors.forEach((hex, i) => arr.set(hexToRgb(hex), i * 3));
    palette[def.id] = arr;
  }
  return palette;
}

export class Renderer {
  private readonly palette = buildPalette();
  private readonly small: HTMLCanvasElement;
  private readonly smallCtx: CanvasRenderingContext2D;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;

  constructor(private readonly grid: Grid, private readonly canvas: HTMLCanvasElement) {
    canvas.width = grid.width * SCALE;
    canvas.height = grid.height * SCALE;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.small = document.createElement('canvas');
    this.small.width = grid.width;
    this.small.height = grid.height;
    this.smallCtx = this.small.getContext('2d')!;
    this.image = this.smallCtx.createImageData(grid.width, grid.height);
  }

  draw(): void {
    const { grid, palette } = this;
    const data = this.image.data;
    let o = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++, o += 4) {
        const pal = palette[grid.cells[o >> 2]];
        // position-hashed variant: stable texture, no flicker
        const v = ((x * 7 + y * 13) % (pal.length / 3)) * 3;
        data[o] = pal[v];
        data[o + 1] = pal[v + 1];
        data[o + 2] = pal[v + 2];
        data[o + 3] = 255;
      }
    }
    this.smallCtx.putImageData(this.image, 0, 0);
    this.ctx.drawImage(this.small, 0, 0, this.canvas.width, this.canvas.height);
  }
}
