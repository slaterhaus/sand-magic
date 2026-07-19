import { describe, expect, it } from 'vitest';
import { EMPTY, SAND } from '../src/elements';
import { Grid } from '../src/engine/grid';
import { paintCircle } from '../src/ui/input';

describe('paintCircle', () => {
  it('paints a filled circle of the element', () => {
    const g = new Grid(9, 9);
    paintCircle(g, 4, 4, 2, SAND);
    expect(g.get(4, 4)).toBe(SAND);
    expect(g.get(4, 2)).toBe(SAND); // on the radius
    expect(g.get(6, 6)).toBe(EMPTY); // outside the circle
  });

  it('clips at world edges without crashing', () => {
    const g = new Grid(5, 5);
    paintCircle(g, 0, 0, 3, SAND);
    expect(g.get(0, 0)).toBe(SAND);
  });

  it('painting EMPTY erases', () => {
    const g = new Grid(5, 5);
    paintCircle(g, 2, 2, 1, SAND);
    paintCircle(g, 2, 2, 1, EMPTY);
    expect(g.get(2, 2)).toBe(EMPTY);
  });
});
