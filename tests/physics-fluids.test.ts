import { describe, expect, it } from 'vitest';
import { EMPTY, OIL, SAND, STEAM, STONE, WATER } from '../src/elements';
import { Grid } from '../src/engine/grid';
import { stepPhysics } from '../src/engine/physics';

const rngZero = (): number => 0;

describe('liquid physics', () => {
  it('water falls into empty space', () => {
    const g = new Grid(3, 3);
    g.set(1, 0, WATER);
    stepPhysics(g, rngZero);
    expect(g.get(1, 1)).toBe(WATER);
  });

  it('water on a floor flows sideways', () => {
    const g = new Grid(5, 3);
    for (let x = 0; x < 5; x++) g.set(x, 2, STONE);
    g.set(1, 1, WATER);
    stepPhysics(g, rngZero); // rngZero: dir = +1, flows right
    expect(g.get(1, 1)).toBe(EMPTY);
    expect(g.get(2, 1)).toBe(WATER);
  });

  it('oil floats on water (denser water will not let oil sink)', () => {
    const g = new Grid(3, 3);
    g.set(1, 2, STONE);
    g.set(1, 1, WATER);
    g.set(1, 0, OIL);
    g.set(0, 1, STONE); // wall off diagonals/sides so nothing flows away
    g.set(2, 1, STONE);
    g.set(0, 0, STONE);
    g.set(2, 0, STONE);
    g.set(0, 2, STONE);
    g.set(2, 2, STONE);
    stepPhysics(g, rngZero);
    expect(g.get(1, 0)).toBe(OIL);
    expect(g.get(1, 1)).toBe(WATER);
  });

  it('water poured on oil sinks below it', () => {
    const g = new Grid(3, 3);
    g.set(1, 2, STONE);
    g.set(1, 1, OIL);
    g.set(1, 0, WATER);
    g.set(0, 1, STONE);
    g.set(2, 1, STONE);
    g.set(0, 0, STONE);
    g.set(2, 0, STONE);
    g.set(0, 2, STONE);
    g.set(2, 2, STONE);
    stepPhysics(g, rngZero);
    expect(g.get(1, 1)).toBe(WATER);
    expect(g.get(1, 0)).toBe(OIL);
  });

  it('sand sinks through water', () => {
    const g = new Grid(3, 3);
    g.set(1, 2, STONE);
    g.set(1, 1, WATER);
    g.set(1, 0, SAND);
    g.set(0, 1, STONE); // wall the water in so it cannot flow away
    g.set(2, 1, STONE);
    g.set(0, 2, STONE);
    g.set(2, 2, STONE);
    stepPhysics(g, rngZero);
    expect(g.get(1, 1)).toBe(SAND);
    expect(g.get(1, 0)).toBe(WATER);
  });
});

describe('gas physics', () => {
  it('steam rises into empty space', () => {
    const g = new Grid(3, 3);
    g.set(1, 2, STEAM);
    stepPhysics(g, rngZero);
    expect(g.get(1, 2)).toBe(EMPTY);
    expect(g.get(1, 1)).toBe(STEAM);
  });

  it('steam bubbles up through water', () => {
    const g = new Grid(3, 3);
    g.set(1, 1, WATER);
    g.set(1, 2, STEAM);
    g.set(0, 2, STONE); // pen it in so the only way is up
    g.set(2, 2, STONE);
    g.set(0, 1, STONE);
    g.set(2, 1, STONE);
    stepPhysics(g, rngZero);
    expect(g.get(1, 1)).toBe(STEAM);
    expect(g.get(1, 2)).toBe(WATER);
  });
});
