import { ELEMENTS, EMPTY, REACTIONS } from '../elements';
import type { Grid } from './grid';
import type { Rng } from './physics';

export interface Discovery {
  name: string;
  science: string;
  swatches: [string, string]; // ingredient colors, for journal cards
}

export type DiscoveryListener = (d: Discovery) => void;

interface Rule {
  aBecomes: number;
  bBecomes: number;
  chance: number;
  discovery?: { name: string; science: string };
  swatches: [string, string];
}

const pairKey = (a: number, b: number): number => a * 256 + b;

const RULES = new Map<number, Rule>();
for (const r of REACTIONS) {
  const swatches: [string, string] = [ELEMENTS[r.a].colors[0], ELEMENTS[r.b].colors[0]];
  RULES.set(pairKey(r.a, r.b), {
    aBecomes: r.aBecomes, bBecomes: r.bBecomes,
    chance: r.chance, discovery: r.discovery, swatches,
  });
  RULES.set(pairKey(r.b, r.a), {
    aBecomes: r.bBecomes, bBecomes: r.aBecomes,
    chance: r.chance, discovery: r.discovery, swatches,
  });
}

export function stepReactions(
  grid: Grid, seen: Set<string>, onDiscovery: DiscoveryListener,
  random: Rng = Math.random,
): void {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.get(x, y) === EMPTY) continue;
      // checking only right + down covers each adjacent pair exactly once
      if (x + 1 < grid.width) tryReact(grid, x, y, x + 1, y, seen, onDiscovery, random);
      if (y + 1 < grid.height) tryReact(grid, x, y, x, y + 1, seen, onDiscovery, random);
    }
  }
}

function tryReact(
  grid: Grid, x: number, y: number, nx: number, ny: number,
  seen: Set<string>, onDiscovery: DiscoveryListener, random: Rng,
): void {
  const a = grid.get(x, y);
  const b = grid.get(nx, ny);
  if (a === EMPTY || b === EMPTY) return;
  const rule = RULES.get(pairKey(a, b));
  if (!rule || random() >= rule.chance) return;
  grid.set(x, y, rule.aBecomes);
  grid.set(nx, ny, rule.bBecomes);
  if (rule.discovery && !seen.has(rule.discovery.name)) {
    seen.add(rule.discovery.name);
    onDiscovery({ ...rule.discovery, swatches: rule.swatches });
  }
}
