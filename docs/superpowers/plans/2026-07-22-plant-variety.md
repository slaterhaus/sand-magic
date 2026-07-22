# Plant Variety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sprouting seeds randomly become one of four plant variants (Grass, Shrub, Flower, Tree) with different colors/heights instead of always the same generic Plant, via a small reusable weighted-random-outcome addition to the reaction engine.

**Architecture:** `Reaction.aBecomes`/`bBecomes` gain an optional `WeightedOutcome[]` form alongside the existing plain `ElementId`; `reactions.ts` resolves whichever form is present, once per reaction firing, via a new `resolveOutcome` helper. `PLANT` is renamed to `GRASS` (same id, retuned color/height) and three new static elements (`SHRUB`, `FLOWER`, `TREE`) are added, reusing the existing `growsInto` straight-up-column growth mechanic unchanged.

**Tech Stack:** Vanilla TypeScript, Vitest. Zero runtime dependencies (unchanged).

## Global Constraints

- Zero runtime npm dependencies (existing constraint, unchanged)
- TypeScript `strict: true`
- All element/reaction data lives in `src/elements.ts`; engine modules (`src/engine/*.ts`) reference elements only via imports from `src/elements.ts`
- No branching/canopy growth shapes — every plant variant grows as a single column via the existing `growsInto` mechanic, unchanged
- No changes to `src/engine/physics.ts`'s `growCell` — reused as-is
- No UI/palette changes — none of the four plant variants are added to `BRUSH_ELEMENTS`
- Weights: Grass 50, Shrub 30, Flower 15, Tree 5 (total 100) — exact values from the approved spec
- Tree burns like Wood (0.02 chance with Fire, 0.02 chance with Lava-ignites-to-Fire); Grass/Shrub/Flower burn at the existing Plant rate (0.06 with Fire, no Lava-specific entry — matches today's data, which has no `LAVA + PLANT` reaction)

---

### Task 1: Weighted-outcome type and resolver in the reaction engine

**Files:**
- Modify: `src/elements.ts:88-95` (the `Reaction` interface)
- Modify: `src/engine/reactions.ts` (the `Rule` interface, `RULES` construction, `tryReact`)

**Interfaces:**
- Consumes: nothing new — existing `Grid`, `Rng`, `REACTIONS`, `ELEMENTS`
- Produces (later tasks in this plan rely on these):
  - `export interface WeightedOutcome { into: ElementId; weight: number }` in `src/elements.ts`
  - `Reaction.aBecomes: ElementId | WeightedOutcome[]` and `Reaction.bBecomes: ElementId | WeightedOutcome[]` (both sides support the array form)
  - `resolveOutcome(outcome: ElementId | WeightedOutcome[], random: Rng): ElementId` in `src/engine/reactions.ts` (not exported — internal to the module, used by `tryReact`)

This task is a pure refactor: it widens a type and adds a resolver function, but no `REACTIONS` entry actually uses the new `WeightedOutcome[]` form yet (that arrives in Task 2). There is nothing new to TDD here — every existing reaction continues to use a plain `ElementId`, so the correct verification is "the entire existing suite still passes, unchanged, after the refactor." Task 2 is where the weighted-outcome behavior itself gets real failing-first tests, once real plant elements exist to test against.

- [ ] **Step 1: Run the full existing suite to record the pre-change baseline**

Run: `npx vitest run`
Expected: 49 tests pass, 9 test files. Note this count — Step 4 below must match it exactly.

- [ ] **Step 2: Add `WeightedOutcome` and widen `Reaction`'s types**

In `src/elements.ts`, replace lines 85-95:

```ts
// When element `a` touches element `b`, `a` becomes `aBecomes` and
// `b` becomes `bBecomes` — with probability `chance` per frame.
// A `discovery` shows up in the journal the FIRST time it ever happens.
export interface Reaction {
  a: ElementId;
  b: ElementId;
  aBecomes: ElementId;
  bBecomes: ElementId;
  chance: number;
  discovery?: { name: string; science: string };
}
```

with:

```ts
// When element `a` touches element `b`, `a` becomes `aBecomes` and
// `b` becomes `bBecomes` — with probability `chance` per frame.
// A `discovery` shows up in the journal the FIRST time it ever happens.
//
// aBecomes/bBecomes are usually a single fixed element. For an outcome
// that should be a surprise — like which kind of plant a seed grows
// into — use a WeightedOutcome[] instead: a list of {into, weight}
// picks, resolved once each time the reaction fires.
export interface WeightedOutcome {
  into: ElementId;
  weight: number;
}

export interface Reaction {
  a: ElementId;
  b: ElementId;
  aBecomes: ElementId | WeightedOutcome[];
  bBecomes: ElementId | WeightedOutcome[];
  chance: number;
  discovery?: { name: string; science: string };
}
```

- [ ] **Step 3: Update `src/engine/reactions.ts` to resolve either form**

Replace the full contents of `src/engine/reactions.ts` with:

```ts
import { ELEMENTS, EMPTY, REACTIONS, type ElementId, type WeightedOutcome } from '../elements';
import type { Grid } from './grid';
import type { Rng } from './physics';

export interface Discovery {
  name: string;
  science: string;
  swatches: [string, string]; // ingredient colors, for journal cards
}

export type DiscoveryListener = (d: Discovery) => void;

interface Rule {
  aBecomes: ElementId | WeightedOutcome[];
  bBecomes: ElementId | WeightedOutcome[];
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

function resolveOutcome(outcome: ElementId | WeightedOutcome[], random: Rng): ElementId {
  if (typeof outcome === 'number') return outcome;
  const total = outcome.reduce((sum, o) => sum + o.weight, 0);
  let roll = random() * total;
  for (const o of outcome) {
    if (roll < o.weight) return o.into;
    roll -= o.weight;
  }
  return outcome[outcome.length - 1].into; // floating-point fallback
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
  grid.set(x, y, resolveOutcome(rule.aBecomes, random));
  grid.set(nx, ny, resolveOutcome(rule.bBecomes, random));
  if (rule.discovery && !seen.has(rule.discovery.name)) {
    onDiscovery({ ...rule.discovery, swatches: rule.swatches });
  }
}
```

Note `resolveOutcome` is called for `aBecomes` and `bBecomes` separately, each consuming its own `random()` call when it needs one (plain `ElementId` values consume zero calls, since the `typeof outcome === 'number'` branch returns immediately without calling `random`) — this matters for the deterministic tests in Task 2, where a `rngZero`/`rngOne`-style fixed-value rng behaves identically whether it's called zero, one, or two times per reaction.

- [ ] **Step 4: Run the full suite to confirm nothing broke**

Run: `npx vitest run`
Expected: 49 tests pass, 9 test files — identical count to Step 1's baseline. This proves the type-widening and resolver refactor is behavior-preserving for every existing (non-weighted) reaction.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/elements.ts src/engine/reactions.ts
git commit -m "feat: support weighted-random outcomes in the reaction engine"
```

---

### Task 2: Grass/Shrub/Flower/Tree elements and the sprouting reactions

**Files:**
- Modify: `src/elements.ts` (element ids, `ELEMENTS`, `REACTIONS`)
- Modify: `tests/physics-growth.test.ts` (rename `PLANT` → `GRASS`, update the max-height test's literal `6` to `4`)
- Test: `tests/elements.test.ts` (extend), `tests/plant-variety.test.ts` (new)

**Interfaces:**
- Consumes: `WeightedOutcome`, widened `Reaction`, and `resolveOutcome`/`tryReact` from Task 1
- Produces: element constants `GRASS` (renamed from `PLANT`, same id `8`), `SHRUB`, `FLOWER`, `TREE` (new ids `20`, `21`, `22`); `SPROUT_OUTCOMES: WeightedOutcome[]` (not exported — module-private in `src/elements.ts`, referenced only by the two sprouting `Reaction` entries in the same file)

- [ ] **Step 1: Write the failing tests**

Create `tests/plant-variety.test.ts`:

```ts
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

  it('the Sprout! discovery still fires exactly once regardless of which variant resulted', () => {
    const g = new Grid(4, 2);
    g.set(1, 0, SEED);
    g.set(2, 0, WATER);
    const events: string[] = [];
    stepReactions(g, new Set(), d => events.push(d.name), () => 0);
    expect(events).toEqual(['Sprout!']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/plant-variety.test.ts`
Expected: FAIL — `GRASS`, `SHRUB`, `FLOWER`, `TREE` are not exported from `../src/elements` yet.

- [ ] **Step 3: Rename `PLANT` to `GRASS` and add the three new element ids**

In `src/elements.ts`, replace line 15:

```ts
export const PLANT = 8;
```

with:

```ts
export const GRASS = 8;   // was PLANT — the common sprout outcome
```

Replace line 26 (`export const RUST = 19;`) — keep it, and add the three new ids immediately after:

```ts
export const RUST = 19;
export const SHRUB = 20;
export const FLOWER = 21;
export const TREE = 22;
```

- [ ] **Step 4: Update the `GRASS` entry in `ELEMENTS` and add `SHRUB`/`FLOWER`/`TREE`**

Replace lines 68-70 (the `SEED`/`PLANT` entries — keep `SEED` as-is, only change what was `PLANT`):

```ts
  [SEED]:     { id: SEED, name: 'Seed', colors: ['#a4d04a'], phase: 'powder', density: 1100 },
  [PLANT]:    { id: PLANT, name: 'Plant', colors: ['#3e9d3e', '#46ac46', '#358a35'], phase: 'static', density: 9999,
                growsInto: { into: PLANT, chance: 0.03, maxHeight: 6 } },
```

with:

```ts
  [SEED]:     { id: SEED, name: 'Seed', colors: ['#a4d04a'], phase: 'powder', density: 1100 },
  [GRASS]:    { id: GRASS, name: 'Grass', colors: ['#3e9d3e', '#46ac46', '#358a35'], phase: 'static', density: 9999,
                growsInto: { into: GRASS, chance: 0.03, maxHeight: 4 } },
```

Then, in the `ELEMENTS` record, immediately after the `[RUST]: ...` line (currently the last entry before the closing `};`), add:

```ts
  [SHRUB]:    { id: SHRUB, name: 'Shrub', colors: ['#2f6b3a', '#275a30'], phase: 'static', density: 9999,
                growsInto: { into: SHRUB, chance: 0.03, maxHeight: 5 } },
  [FLOWER]:   { id: FLOWER, name: 'Flower', colors: ['#3e9d3e', '#e85d9c', '#f0c445', '#9a6fd6'], phase: 'static', density: 9999,
                growsInto: { into: FLOWER, chance: 0.03, maxHeight: 5 } },
  [TREE]:     { id: TREE, name: 'Tree', colors: ['#4a3420', '#3d2a18'], phase: 'static', density: 9999,
                growsInto: { into: TREE, chance: 0.03, maxHeight: 10 } },
```

- [ ] **Step 5: Add `SPROUT_OUTCOMES` and rewrite the sprouting/spreading/burning reactions**

In `src/elements.ts`, immediately before the `export const REACTIONS: Reaction[] = [` line, add:

```ts
const SPROUT_OUTCOMES: WeightedOutcome[] = [
  { into: GRASS, weight: 50 },
  { into: SHRUB, weight: 30 },
  { into: FLOWER, weight: 15 },
  { into: TREE, weight: 5 },
];
```

Replace this line (currently `{ a: FIRE, b: PLANT, aBecomes: FIRE, bBecomes: FIRE, chance: 0.06 },`):

```ts
  { a: FIRE, b: PLANT, aBecomes: FIRE, bBecomes: FIRE, chance: 0.06 },
```

with four entries (Grass/Shrub/Flower burn like the old generic Plant; Tree gets its own slow-burn entry matching Wood's rate):

```ts
  { a: FIRE, b: GRASS, aBecomes: FIRE, bBecomes: FIRE, chance: 0.06 },
  { a: FIRE, b: SHRUB, aBecomes: FIRE, bBecomes: FIRE, chance: 0.06 },
  { a: FIRE, b: FLOWER, aBecomes: FIRE, bBecomes: FIRE, chance: 0.06 },
  { a: FIRE, b: TREE, aBecomes: FIRE, bBecomes: FIRE, chance: 0.02 },
  { a: LAVA, b: TREE, aBecomes: LAVA, bBecomes: FIRE, chance: 0.02 },
```

Replace this line (`{ a: SEED, b: WATER, aBecomes: PLANT, bBecomes: PLANT, chance: 1, discovery: {...} },`):

```ts
  { a: SEED, b: WATER, aBecomes: PLANT, bBecomes: PLANT, chance: 1,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
```

with:

```ts
  { a: SEED, b: WATER, aBecomes: SPROUT_OUTCOMES, bBecomes: WATER, chance: 1,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
```

Replace this line (`{ a: PLANT, b: WATER, aBecomes: PLANT, bBecomes: PLANT, chance: 0.02, discovery: {...} },`) — the "established plant spreads into adjacent water" mechanic, extended to all four variants, each keeping the exact same shape (`aBecomes` the same type, `bBecomes` the same type — this reaction is not changed to `bBecomes: WATER`, per the spec, since it is intentional spreading behavior, not the sprouting bug):

```ts
  { a: PLANT, b: WATER, aBecomes: PLANT, bBecomes: PLANT, chance: 0.02,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
```

with:

```ts
  { a: GRASS, b: WATER, aBecomes: GRASS, bBecomes: GRASS, chance: 0.02,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
  { a: SHRUB, b: WATER, aBecomes: SHRUB, bBecomes: SHRUB, chance: 0.02,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
  { a: FLOWER, b: WATER, aBecomes: FLOWER, bBecomes: FLOWER, chance: 0.02,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
  { a: TREE, b: WATER, aBecomes: TREE, bBecomes: TREE, chance: 0.02,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
```

Replace this line (`{ a: SEED, b: DIRT, aBecomes: PLANT, bBecomes: DIRT, chance: 1, discovery: {...} },`):

```ts
  { a: SEED, b: DIRT, aBecomes: PLANT, bBecomes: DIRT, chance: 1,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
```

with:

```ts
  { a: SEED, b: DIRT, aBecomes: SPROUT_OUTCOMES, bBecomes: DIRT, chance: 1,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
```

- [ ] **Step 6: Update `tests/physics-growth.test.ts` for the `PLANT` → `GRASS` rename and the maxHeight change**

Replace line 2:

```ts
import { EMPTY, PLANT, STEAM, STONE, WATER } from '../src/elements';
```

with:

```ts
import { EMPTY, GRASS, STEAM, STONE, WATER } from '../src/elements';
```

Replace the entire `describe('plant growth', ...)` block (every `g.set(..., PLANT)` and `expect(...).toBe(PLANT)` becomes `GRASS`) with the full corrected version below — the `describe('steam condensation', ...)` block further down the file is unrelated and is not touched:

```ts
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
```

(The `describe('steam condensation', ...)` block below it is unrelated and stays exactly as-is.)

- [ ] **Step 7: Update `tests/elements.test.ts`'s reaction-validity test to handle `WeightedOutcome[]`**

Replace the `'reactions only reference defined elements and have valid chances'` test:

```ts
  it('reactions only reference defined elements and have valid chances', () => {
    expect(REACTIONS.length).toBeGreaterThan(0);
    for (const r of REACTIONS) {
      for (const id of [r.a, r.b, r.aBecomes, r.bBecomes]) {
        expect(ELEMENTS[id]).toBeDefined();
      }
      expect(r.chance).toBeGreaterThan(0);
      expect(r.chance).toBeLessThanOrEqual(1);
    }
  });
```

with:

```ts
  it('reactions only reference defined elements and have valid chances', () => {
    expect(REACTIONS.length).toBeGreaterThan(0);
    const checkOutcome = (outcome: number | { into: number; weight: number }[]): void => {
      if (typeof outcome === 'number') {
        expect(ELEMENTS[outcome]).toBeDefined();
        return;
      }
      expect(outcome.length).toBeGreaterThan(0);
      for (const o of outcome) {
        expect(ELEMENTS[o.into]).toBeDefined();
        expect(o.weight).toBeGreaterThan(0);
      }
    };
    for (const r of REACTIONS) {
      expect(ELEMENTS[r.a]).toBeDefined();
      expect(ELEMENTS[r.b]).toBeDefined();
      checkOutcome(r.aBecomes);
      checkOutcome(r.bBecomes);
      expect(r.chance).toBeGreaterThan(0);
      expect(r.chance).toBeLessThanOrEqual(1);
    }
  });
```

- [ ] **Step 8: Run the new and updated tests to verify they pass**

Run: `npx vitest run tests/plant-variety.test.ts tests/physics-growth.test.ts tests/elements.test.ts`
Expected: PASS — `tests/plant-variety.test.ts` (6 tests), `tests/physics-growth.test.ts` (7 tests, unchanged count), `tests/elements.test.ts` (7 tests, unchanged count).

- [ ] **Step 9: Run the full suite**

Run: `npx vitest run`
Expected: PASS, 10 test files (9 existing + new `tests/plant-variety.test.ts`), 55 tests total (49 baseline + 6 new).

- [ ] **Step 10: Run typecheck and build**

Run: `npx tsc --noEmit && npm run build`
Expected: both clean, no errors. (This also catches any remaining reference to the now-removed `PLANT` export outside the files touched above — if the build fails on an unresolved `PLANT` import, search `grep -rn "\bPLANT\b" src/` and fix the remaining reference before proceeding.)

- [ ] **Step 11: Commit**

```bash
git add src/elements.ts tests/physics-growth.test.ts tests/elements.test.ts tests/plant-variety.test.ts
git commit -m "feat: sprouting seeds become one of four plant variants (Grass/Shrub/Flower/Tree)"
```

---

## Verification checklist (whole feature)

- `npx vitest run` → 10 test files, 55 tests, all pass
- `npx tsc --noEmit` → clean
- `npm run build` → clean, `dist/` emitted
- Manual play: paint several seeds into water and into dirt; over repeated sprouts, see Grass appear most often, Shrub often, Flower sometimes, Tree rarely (roughly 1-in-20). Confirm each grows to a visibly different capped height (Grass shortest, Tree tallest). Confirm Fire burns Grass/Shrub/Flower quickly and Tree slowly (like Wood). Confirm exactly one "Sprout!" journal card exists regardless of how many different variants have been grown.
- Final verifier: an 8-year-old, ideally noticing "ooh, I got a tree!" as a rare, exciting outcome.
