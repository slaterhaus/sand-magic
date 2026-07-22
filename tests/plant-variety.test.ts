import { describe, expect, it } from 'vitest';
import { DIRT, FLOWER, GRASS, SEED, SHRUB, TREE, WATER } from '../src/elements';
import { Grid } from '../src/engine/grid';
import { stepReactions } from '../src/engine/reactions';

describe('plant variety on sprouting', () => {
  it('a low rng roll produces the common outcome (Grass)', () => {
    const g = new Grid(4, 2);
    g.set(1, 0, SEED);
    g.set(2, 0, WATER);
    // first random() picks the reaction fires (chance 1, any roll passes),
    // second random() resolves aBecomes: with weights 50/30/15/5 (total
    // 100), a roll near 0 lands in the first band (Grass, weight 50)
    const rng = (): number => 0;
    stepReactions(g, new Set(), () => {}, rng);
    expect(g.get(1, 0)).toBe(GRASS);
  });

  it('a high rng roll produces the rare outcome (Tree)', () => {
    const g = new Grid(4, 2);
    g.set(1, 0, SEED);
    g.set(2, 0, WATER);
    // roll near (but under) 1.0 lands in the last band (Tree, weight 5,
    // spanning [95, 100) of the total 100) — 0.99 * 100 = 99, which is
    // >= 95 (start of Tree's band: 50+30+15=95) and < 100
    const rng = (): number => 0.99;
    stepReactions(g, new Set(), () => {}, rng);
    expect(g.get(1, 0)).toBe(TREE);
  });

  it('mid-range rolls produce Shrub and Flower at their band boundaries', () => {
    const gShrub = new Grid(4, 2);
    gShrub.set(1, 0, SEED);
    gShrub.set(2, 0, WATER);
    // Shrub's band is [50, 80) of 100 — 0.5 * 100 = 50, the start of the band
    stepReactions(gShrub, new Set(), () => {}, () => 0.5);
    expect(gShrub.get(1, 0)).toBe(SHRUB);

    const gFlower = new Grid(4, 2);
    gFlower.set(1, 0, SEED);
    gFlower.set(2, 0, WATER);
    // Flower's band is [80, 95) of 100 — 0.8 * 100 = 80, the start of the band
    stepReactions(gFlower, new Set(), () => {}, () => 0.8);
    expect(gFlower.get(1, 0)).toBe(FLOWER);
  });

  it('water is not consumed when a seed sprouts in it', () => {
    const g = new Grid(4, 2);
    g.set(1, 0, SEED);
    g.set(2, 0, WATER);
    stepReactions(g, new Set(), () => {}, () => 0);
    expect(g.get(2, 0)).toBe(WATER);
  });

  it('dirt is not consumed when a seed sprouts in it, and still produces a weighted plant', () => {
    const g = new Grid(4, 2);
    g.set(1, 0, SEED);
    g.set(2, 0, DIRT);
    stepReactions(g, new Set(), () => {}, () => 0);
    expect(g.get(1, 0)).toBe(GRASS);
    expect(g.get(2, 0)).toBe(DIRT);
  });

  it('resolves correctly through the mirrored rule too (water scanned before the seed)', () => {
    // stepReactions scans left-to-right/top-to-bottom and checks each cell's
    // right+down neighbor, so placing WATER before SEED in scan order makes
    // tryReact see (a=WATER, b=SEED) — the auto-mirrored rule, where
    // SPROUT_OUTCOMES sits in bBecomes rather than aBecomes. This pins that
    // the array form works from both slots, not just the one every other
    // test in this file happens to exercise.
    const g = new Grid(4, 2);
    g.set(1, 0, WATER);
    g.set(2, 0, SEED);
    stepReactions(g, new Set(), () => {}, () => 0);
    expect(g.get(2, 0)).toBe(GRASS);
    expect(g.get(1, 0)).toBe(WATER);
  });

  it('the Sprout! discovery still fires exactly once regardless of which variant resulted', () => {
    const g = new Grid(4, 2);
    g.set(1, 0, SEED);
    g.set(2, 0, WATER);
    const events: string[] = [];
    stepReactions(g, new Set(), d => events.push(d.name), () => 0);
    expect(events).toEqual(['Sprout!']);
  });
});
