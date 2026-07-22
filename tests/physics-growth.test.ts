import { describe, expect, it } from 'vitest';
import { EMPTY, GRASS, STEAM, STONE, WATER } from '../src/elements';
import { Grid } from '../src/engine/grid';
import { stepPhysics } from '../src/engine/physics';

const rngZero = (): number => 0; // always passes any `< chance` check
const rngOne = (): number => 1;  // always fails any `< chance` check

describe('plant growth', () => {
  it('a plant with life 0 and empty space above grows upward', () => {
    const g = new Grid(3, 3);
    g.set(1, 2, GRASS);
    stepPhysics(g, rngZero);
    expect(g.get(1, 1)).toBe(GRASS);
    expect(g.life[g.index(1, 1)]).toBe(1);
  });

  it('a plant at max height does not grow further', () => {
    const g = new Grid(3, 10);
    g.set(1, 9, GRASS);
    g.life[g.index(1, 9)] = 4; // already at maxHeight (Grass caps at 4, was 6)
    stepPhysics(g, rngZero);
    expect(g.get(1, 8)).toBe(EMPTY);
    expect(g.get(1, 9)).toBe(GRASS);
  });

  it('a plant with something solid directly above does not grow', () => {
    const g = new Grid(3, 3);
    g.set(1, 1, GRASS);
    g.set(1, 0, STONE);
    expect(() => stepPhysics(g, rngZero)).not.toThrow();
    expect(g.get(1, 0)).toBe(STONE);
    expect(g.get(1, 1)).toBe(GRASS);
  });

  it('does not grow when the growth chance roll fails', () => {
    const g = new Grid(3, 3);
    g.set(1, 2, GRASS);
    stepPhysics(g, rngOne);
    expect(g.get(1, 1)).toBe(EMPTY);
    expect(g.get(1, 2)).toBe(GRASS);
  });
});

describe('steam condensation', () => {
  it('steam near the top row condenses to water', () => {
    const g = new Grid(3, 20);
    g.set(1, 0, STEAM); // row 0 is within top 15% of a 20-row grid
    stepPhysics(g, rngZero);
    expect(g.get(1, 0)).toBe(WATER);
  });

  it('steam in the middle of the grid does not condense regardless of rng', () => {
    const g = new Grid(3, 20);
    g.set(1, 10, STEAM);
    stepPhysics(g, rngZero);
    expect(g.get(1, 9)).toBe(STEAM); // moved up (gas rises), not condensed
  });

  it('steam at the bottom of the grid does not condense regardless of rng', () => {
    const g = new Grid(3, 20);
    g.set(1, 19, STEAM);
    stepPhysics(g, rngZero);
    expect(g.get(1, 18)).toBe(STEAM);
  });
});
