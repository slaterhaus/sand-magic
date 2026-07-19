import { describe, expect, it } from 'vitest';
import { EMPTY, SAND, WATER } from '../src/elements';
import { Grid } from '../src/engine/grid';

describe('Grid', () => {
  it('starts empty', () => {
    const g = new Grid(4, 3);
    expect(g.get(0, 0)).toBe(EMPTY);
    expect(g.get(3, 2)).toBe(EMPTY);
  });

  it('set and get round-trip', () => {
    const g = new Grid(4, 3);
    g.set(2, 1, SAND);
    expect(g.get(2, 1)).toBe(SAND);
  });

  it('set resets life to zero', () => {
    const g = new Grid(4, 3);
    g.life[g.index(2, 1)] = 42;
    g.set(2, 1, SAND);
    expect(g.life[g.index(2, 1)]).toBe(0);
  });

  it('swap exchanges cells and life', () => {
    const g = new Grid(4, 3);
    g.set(0, 0, SAND);
    g.life[g.index(0, 0)] = 7;
    g.set(1, 0, WATER);
    g.swap(0, 0, 1, 0);
    expect(g.get(0, 0)).toBe(WATER);
    expect(g.get(1, 0)).toBe(SAND);
    expect(g.life[g.index(1, 0)]).toBe(7);
  });

  it('inBounds', () => {
    const g = new Grid(4, 3);
    expect(g.inBounds(0, 0)).toBe(true);
    expect(g.inBounds(3, 2)).toBe(true);
    expect(g.inBounds(4, 2)).toBe(false);
    expect(g.inBounds(-1, 0)).toBe(false);
    expect(g.inBounds(0, 3)).toBe(false);
  });

  it('clear empties everything', () => {
    const g = new Grid(4, 3);
    g.set(2, 1, SAND);
    g.life[g.index(2, 1)] = 9;
    g.clear();
    expect(g.get(2, 1)).toBe(EMPTY);
    expect(g.life[g.index(2, 1)]).toBe(0);
  });
});
