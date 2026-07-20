import { ELEMENTS, EMPTY, type ElementDef } from '../elements';
import type { Grid } from './grid';

export type Rng = () => number;

export function stepPhysics(grid: Grid, random: Rng = Math.random): void {
  grid.moved.fill(0);
  for (let y = grid.height - 1; y >= 0; y--) {
    const leftToRight = random() < 0.5;
    for (let i = 0; i < grid.width; i++) {
      const x = leftToRight ? i : grid.width - 1 - i;
      updateCell(grid, x, y, random);
    }
  }
}

const CONDENSE_CHANCE = 0.05;

function updateCell(grid: Grid, x: number, y: number, random: Rng): void {
  const i = grid.index(x, y);
  if (grid.moved[i]) return;
  const id = grid.cells[i];
  if (id === EMPTY) return;
  const def = ELEMENTS[id];

  if (def.decay && decayCell(grid, i, def, random)) return;
  if (def.condenseNearTop && condenseCell(grid, i, x, y, def, random)) return;

  if (def.phase === 'powder') movePowder(grid, x, y, def, random);
  else if (def.phase === 'liquid') moveLiquid(grid, x, y, def, random);
  else if (def.phase === 'gas') moveGas(grid, x, y, def, random);
  // static never moves

  if (def.growsInto) growCell(grid, i, x, y, def, random);
}

function condenseCell(
  grid: Grid, i: number, x: number, y: number, def: ElementDef, random: Rng,
): boolean {
  const c = def.condenseNearTop!;
  if (y >= grid.height * c.rowFraction) return false;
  if (random() >= CONDENSE_CHANCE) return false;
  grid.set(x, y, c.into);
  grid.moved[i] = 1;
  return true;
}

function growCell(grid: Grid, i: number, x: number, y: number, def: ElementDef, random: Rng): void {
  const g = def.growsInto!;
  if (grid.life[i] >= g.maxHeight) return;
  if (random() >= g.chance) return;
  const ny = y - 1;
  if (!grid.inBounds(x, ny)) return;
  if (grid.cells[grid.index(x, ny)] !== EMPTY) return;
  const nextLife = grid.life[i] + 1;
  grid.set(x, ny, g.into);
  grid.life[grid.index(x, ny)] = nextLife;
}

function decayCell(grid: Grid, i: number, def: ElementDef, random: Rng): boolean {
  const d = def.decay!;
  grid.life[i]++;
  if (grid.life[i] <= d.after) return false;
  const alt = d.altInto !== undefined && random() < (d.altChance ?? 0);
  grid.cells[i] = alt ? d.altInto! : d.into;
  grid.life[i] = 0;
  grid.moved[i] = 1;
  return true;
}

function movePowder(grid: Grid, x: number, y: number, def: ElementDef, random: Rng): void {
  if (tryMove(grid, x, y, x, y + 1, def)) return;
  const dir = random() < 0.5 ? 1 : -1;
  if (tryMove(grid, x, y, x + dir, y + 1, def)) return;
  tryMove(grid, x, y, x - dir, y + 1, def);
}

function moveLiquid(grid: Grid, x: number, y: number, def: ElementDef, random: Rng): void {
  // gooey liquids (lava) skip most turns
  if ((def.flowChance ?? 1) < random()) return;
  if (tryMove(grid, x, y, x, y + 1, def)) return;
  const dir = random() < 0.5 ? 1 : -1;
  if (tryMove(grid, x, y, x + dir, y + 1, def)) return;
  if (tryMove(grid, x, y, x - dir, y + 1, def)) return;
  if (tryMove(grid, x, y, x + dir, y, def, true)) return;
  tryMove(grid, x, y, x - dir, y, def, true);
}

function moveGas(grid: Grid, x: number, y: number, def: ElementDef, random: Rng): void {
  if (tryMove(grid, x, y, x, y - 1, def)) return;
  const dir = random() < 0.5 ? 1 : -1;
  if (tryMove(grid, x, y, x + dir, y - 1, def)) return;
  if (tryMove(grid, x, y, x - dir, y - 1, def)) return;
  if (random() < 0.5) tryMove(grid, x, y, x + dir, y, def, true);
}

// Move (x,y) → (nx,ny). Into EMPTY: always. Into liquid/gas: displacement
// by density — moving down displaces lighter, moving up displaces heavier.
// Never displaces static or powder. `emptyOnly` restricts to EMPTY targets
// (used for sideways flow so liquids do not jitter-swap).
function tryMove(
  grid: Grid, x: number, y: number, nx: number, ny: number,
  def: ElementDef, emptyOnly = false,
): boolean {
  if (!grid.inBounds(nx, ny)) return false;
  const j = grid.index(nx, ny);
  const target = grid.cells[j];
  if (target !== EMPTY) {
    if (emptyOnly) return false;
    const tdef = ELEMENTS[target];
    if (tdef.phase === 'static' || tdef.phase === 'powder') return false;
    const movingDown = ny > y;
    const canDisplace = movingDown
      ? tdef.density < def.density
      : tdef.density > def.density;
    if (!canDisplace) return false;
  }
  grid.swap(x, y, nx, ny);
  grid.moved[grid.index(x, y)] = 1;
  grid.moved[j] = 1;
  return true;
}
