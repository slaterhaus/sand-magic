import { describe, expect, it } from 'vitest';
import { ASH, EMPTY, FIRE, SAND, STONE } from '../src/elements';
import { Grid } from '../src/engine/grid';
import { stepPhysics } from '../src/engine/physics';

// deterministic rng: always 0 (row scan left-to-right, diagonal dir = +1)
const rngZero = (): number => 0;

describe('powder physics', () => {
  it('sand falls straight down into empty space', () => {
    const g = new Grid(5, 5);
    g.set(2, 0, SAND);
    stepPhysics(g, rngZero);
    expect(g.get(2, 0)).toBe(EMPTY);
    expect(g.get(2, 1)).toBe(SAND);
  });

  it('sand falls exactly one cell per frame (no tunneling)', () => {
    const g = new Grid(5, 5);
    g.set(2, 0, SAND);
    stepPhysics(g, rngZero);
    expect(g.get(2, 2)).toBe(EMPTY);
  });

  it('sand slides diagonally off an obstacle', () => {
    const g = new Grid(5, 5);
    g.set(2, 1, STONE);
    g.set(2, 0, SAND);
    stepPhysics(g, rngZero);
    expect(g.get(2, 0)).toBe(EMPTY);
    expect(g.get(3, 1)).toBe(SAND); // rngZero picks +1 (right) first
  });

  it('sand at rest in a pocket stays put', () => {
    const g = new Grid(3, 3);
    // stone floor across the bottom, sand sitting on it
    g.set(0, 2, STONE);
    g.set(1, 2, STONE);
    g.set(2, 2, STONE);
    g.set(1, 1, SAND);
    // diagonals below are stone too, so sand cannot move
    g.set(0, 1, STONE);
    g.set(2, 1, STONE);
    stepPhysics(g, rngZero);
    expect(g.get(1, 1)).toBe(SAND);
  });

  it('sand stops at the bottom edge of the world', () => {
    const g = new Grid(3, 2);
    g.set(1, 1, SAND);
    stepPhysics(g, rngZero);
    expect(g.get(1, 1)).toBe(SAND);
  });
});

describe('decay', () => {
  it('boxed-in fire turns to ash after its lifetime (rngZero takes altInto)', () => {
    const g = new Grid(3, 3);
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 3; x++)
        if (x !== 1 || y !== 1) g.set(x, y, STONE);
    g.set(1, 1, FIRE);
    for (let i = 0; i < 60; i++) stepPhysics(g, rngZero);
    expect(g.get(1, 1)).toBe(FIRE); // life = 60, not yet past `after: 60`
    stepPhysics(g, rngZero);
    expect(g.get(1, 1)).toBe(ASH); // rngZero < altChance 0.1 → ash
  });
});
