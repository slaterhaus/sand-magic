import type { ElementId } from '../elements';

export class Grid {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
  readonly life: Uint16Array;   // frames since a cell was created (for decay)
  readonly moved: Uint8Array;   // per-frame flag: already updated this frame

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = new Uint8Array(width * height);
    this.life = new Uint16Array(width * height);
    this.moved = new Uint8Array(width * height);
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x: number, y: number): ElementId {
    return this.cells[this.index(x, y)];
  }

  set(x: number, y: number, id: ElementId): void {
    const i = this.index(x, y);
    this.cells[i] = id;
    this.life[i] = 0;
  }

  swap(x1: number, y1: number, x2: number, y2: number): void {
    const i = this.index(x1, y1);
    const j = this.index(x2, y2);
    const c = this.cells[i];
    this.cells[i] = this.cells[j];
    this.cells[j] = c;
    const l = this.life[i];
    this.life[i] = this.life[j];
    this.life[j] = l;
  }

  clear(): void {
    this.cells.fill(0);
    this.life.fill(0);
  }
}
