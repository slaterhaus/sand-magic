import { describe, expect, it } from 'vitest';
import { LAVA, OBSIDIAN, SAND, STEAM, WATER } from '../src/elements';
import { Grid } from '../src/engine/grid';
import { stepReactions, type Discovery } from '../src/engine/reactions';

const rngZero = (): number => 0;

describe('reactions', () => {
  it('lava + water makes obsidian + steam', () => {
    const g = new Grid(4, 2);
    g.set(1, 0, LAVA);
    g.set(2, 0, WATER);
    stepReactions(g, new Set(), () => {}, rngZero);
    expect(g.get(1, 0)).toBe(OBSIDIAN);
    expect(g.get(2, 0)).toBe(STEAM);
  });

  it('works in the reversed orientation too', () => {
    const g = new Grid(4, 2);
    g.set(1, 0, WATER);
    g.set(2, 0, LAVA);
    stepReactions(g, new Set(), () => {}, rngZero);
    expect(g.get(1, 0)).toBe(STEAM);
    expect(g.get(2, 0)).toBe(OBSIDIAN);
  });

  it('non-reacting neighbors are untouched', () => {
    const g = new Grid(4, 2);
    g.set(1, 0, SAND);
    g.set(2, 0, WATER);
    stepReactions(g, new Set(), () => {}, rngZero);
    expect(g.get(1, 0)).toBe(SAND);
    expect(g.get(2, 0)).toBe(WATER);
  });

  it('respects chance (rng above chance blocks the reaction)', () => {
    const g = new Grid(4, 2);
    g.set(1, 0, LAVA);
    g.set(2, 0, WATER);
    stepReactions(g, new Set(), () => {}, () => 0.99); // 0.99 >= 0.9 chance
    expect(g.get(1, 0)).toBe(LAVA);
    expect(g.get(2, 0)).toBe(WATER);
  });

  it('emits each discovery exactly once, even across steps', () => {
    const g = new Grid(6, 2);
    g.set(0, 0, LAVA);
    g.set(1, 0, WATER);
    g.set(3, 0, LAVA);
    g.set(4, 0, WATER);
    const seen = new Set<string>();
    const events: Discovery[] = [];
    const onDiscovery = (d: Discovery): void => { seen.add(d.name); events.push(d); };
    stepReactions(g, seen, onDiscovery, rngZero);
    expect(events.length).toBe(1);
    expect(events[0].name).toBe('Obsidian!');
    expect(events[0].science).toContain('lava');
    expect(events[0].swatches.length).toBe(2);
    // refill and react again — no second event
    g.set(0, 1, LAVA);
    g.set(1, 1, WATER);
    stepReactions(g, seen, onDiscovery, rngZero);
    expect(events.length).toBe(1);
  });
});
