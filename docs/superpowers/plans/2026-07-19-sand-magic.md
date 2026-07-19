# Sand Magic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A falling-sand physics sandbox web game where an 8-year-old paints elements (sand, water, lava, fire…), watches real physical properties drive interactions, and collects first-time reactions in a discovery journal with kid-friendly science notes.

**Architecture:** Fixed 400×250 cell grid in typed arrays; per-frame cellular-automata pass (bottom-up scan, moved-flags) applies phase rules (powder falls, liquid flows, gas rises) with density-based displacement; a separate reactions pass applies a data-driven reaction table and emits discovery events. All element behavior lives in one data file, `src/elements.ts` — the engine never hardcodes element names. Canvas 2D rendering via ImageData blit scaled ×3.

**Tech Stack:** Vanilla TypeScript, Vite, Vitest, Canvas 2D. Zero runtime dependencies. Static deploy to GitHub Pages.

## Global Constraints

- Repo root: `/Users/thomasslater/projects/sand-magic` (git repo already initialized, branch `main`)
- Zero runtime npm dependencies; devDependencies only: `vite`, `typescript`, `vitest`
- TypeScript `strict: true`
- Grid is exactly 400×250 cells, rendered at SCALE = 3 (1200×750 canvas)
- localStorage key is exactly `sand-magic-journal`
- Journal UI shows ONLY found discoveries — never empty slots, never counters like "4/12 found" (perfectionism-safe, from spec)
- No failure states anywhere in the app; the clear-world confirm is playful, not scary
- All element/reaction data lives in `src/elements.ts` with kid-readable comments; engine modules must not reference specific element ids except via imports from `src/elements.ts`
- Tests must not require a browser or jsdom — DOM-touching code is verified manually in the browser; pure logic is unit tested

---

### Task 1: Project scaffold + `elements.ts` data module

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `index.html`
- Create: `src/elements.ts`
- Test: `tests/elements.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces (used by every later task):
  - `type ElementId = number`
  - const element ids: `EMPTY(0), SAND(1), WATER(2), STONE(3), LAVA(4), FIRE(5), WOOD(6), SEED(7), PLANT(8), STEAM(9), ICE(10), OIL(11), ASH(12), OBSIDIAN(13)`
  - `type Phase = 'static' | 'powder' | 'liquid' | 'gas'`
  - `interface ElementDef { id: ElementId; name: string; colors: string[]; phase: Phase; density: number; flowChance?: number; decay?: { after: number; into: ElementId; altInto?: ElementId; altChance?: number } }`
  - `const ELEMENTS: Record<ElementId, ElementDef>`
  - `interface Reaction { a: ElementId; b: ElementId; aBecomes: ElementId; bBecomes: ElementId; chance: number; discovery?: { name: string; science: string } }`
  - `const REACTIONS: Reaction[]`
  - `const BRUSH_ELEMENTS: ElementId[]`

- [ ] **Step 1: Write scaffold files**

`package.json`:

```json
{
  "name": "sand-magic",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

`.gitignore`:

```
node_modules/
dist/
```

`index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sand Magic ✨</title>
</head>
<body>
  <div id="app">
    <aside id="controls"></aside>
    <main id="stage"><canvas id="world"></canvas></main>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

Run: `npm install`
Expected: installs the three dev dependencies without errors.

- [ ] **Step 2: Write the failing test**

`tests/elements.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BRUSH_ELEMENTS, ELEMENTS, EMPTY, REACTIONS } from '../src/elements';

describe('element definitions', () => {
  it('every record key matches its def id', () => {
    for (const [key, def] of Object.entries(ELEMENTS)) {
      expect(Number(key)).toBe(def.id);
    }
  });

  it('every color is a 6-digit lowercase hex', () => {
    for (const def of Object.values(ELEMENTS)) {
      expect(def.colors.length).toBeGreaterThan(0);
      for (const c of def.colors) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

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

  it('brush elements are defined and do not include the eraser', () => {
    expect(BRUSH_ELEMENTS.length).toBeGreaterThan(0);
    for (const id of BRUSH_ELEMENTS) {
      expect(ELEMENTS[id]).toBeDefined();
      expect(id).not.toBe(EMPTY);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/elements.test.ts`
Expected: FAIL — cannot resolve `../src/elements`.

- [ ] **Step 4: Write `src/elements.ts`**

This file is the project's tweak point — keep the comments; they are for co-editing sessions with an 8-year-old at the keyboard.

```ts
// ✨ THE MAGIC INGREDIENTS FILE ✨
// Everything in the game is defined here. Change a color, invent a
// reaction, make up a new element — the engine reads only this file.

export type ElementId = number;

export const EMPTY = 0;    // air (also the eraser)
export const SAND = 1;
export const WATER = 2;
export const STONE = 3;
export const LAVA = 4;
export const FIRE = 5;
export const WOOD = 6;
export const SEED = 7;
export const PLANT = 8;
export const STEAM = 9;
export const ICE = 10;
export const OIL = 11;
export const ASH = 12;
export const OBSIDIAN = 13;

// How an element moves:
//  static = never moves (stone, wood, ice...)
//  powder = falls and piles up (sand, ash)
//  liquid = falls and flows sideways (water, lava, oil)
//  gas    = floats up (steam, fire)
export type Phase = 'static' | 'powder' | 'liquid' | 'gas';

export interface ElementDef {
  id: ElementId;
  name: string;
  colors: string[];     // a few shades so it looks textured, not flat
  phase: Phase;
  density: number;      // heavier sinks below lighter (oil floats on water!)
  flowChance?: number;  // liquids only: 1 = runny, 0.3 = gooey like lava
  decay?: {             // element transforms after `after` frames
    after: number;
    into: ElementId;
    altInto?: ElementId;   // sometimes becomes this instead...
    altChance?: number;    // ...with this probability (fire leaves ash)
  };
}

export const ELEMENTS: Record<ElementId, ElementDef> = {
  [EMPTY]:    { id: EMPTY, name: 'Air', colors: ['#101418'], phase: 'gas', density: 0 },
  [SAND]:     { id: SAND, name: 'Sand', colors: ['#e6c86e', '#dcbb5f', '#d4b054'], phase: 'powder', density: 1600 },
  [WATER]:    { id: WATER, name: 'Water', colors: ['#3f76d4', '#4a82df', '#3a6ec8'], phase: 'liquid', density: 1000 },
  [STONE]:    { id: STONE, name: 'Stone', colors: ['#8a8d93', '#7e8187', '#94979d'], phase: 'static', density: 9999 },
  [LAVA]:     { id: LAVA, name: 'Lava', colors: ['#e2571e', '#f06c24', '#c9481a'], phase: 'liquid', density: 1800, flowChance: 0.3 },
  [FIRE]:     { id: FIRE, name: 'Fire', colors: ['#ffb020', '#ff8c1a', '#ffd54d'], phase: 'gas', density: 2,
                decay: { after: 60, into: EMPTY, altInto: ASH, altChance: 0.1 } },
  [WOOD]:     { id: WOOD, name: 'Wood', colors: ['#7a5230', '#6e4a2b', '#835a36'], phase: 'static', density: 9999 },
  [SEED]:     { id: SEED, name: 'Seed', colors: ['#a4d04a'], phase: 'powder', density: 1100 },
  [PLANT]:    { id: PLANT, name: 'Plant', colors: ['#3e9d3e', '#46ac46', '#358a35'], phase: 'static', density: 9999 },
  [STEAM]:    { id: STEAM, name: 'Steam', colors: ['#c9d4dd', '#bcc8d2'], phase: 'gas', density: 1,
                decay: { after: 300, into: WATER } },  // steam cools back into rain!
  [ICE]:      { id: ICE, name: 'Ice', colors: ['#aee1f5', '#9fd6ee'], phase: 'static', density: 9999 },
  [OIL]:      { id: OIL, name: 'Oil', colors: ['#4b3a5a', '#544166'], phase: 'liquid', density: 900 },
  [ASH]:      { id: ASH, name: 'Ash', colors: ['#9b9b93', '#8f8f88'], phase: 'powder', density: 700 },
  [OBSIDIAN]: { id: OBSIDIAN, name: 'Obsidian', colors: ['#2b2733', '#342f3f'], phase: 'static', density: 9999 },
};

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

export const REACTIONS: Reaction[] = [
  { a: LAVA, b: WATER, aBecomes: OBSIDIAN, bBecomes: STEAM, chance: 0.9,
    discovery: { name: 'Obsidian!', science: 'When lava touches water it cools in an instant into shiny black volcanic glass. Brand-new islands are born this way!' } },
  { a: FIRE, b: WATER, aBecomes: STEAM, bBecomes: WATER, chance: 0.4,
    discovery: { name: 'Steam!', science: 'When water gets hot enough it boils into steam — the very same water, floating as a gas!' } },
  { a: FIRE, b: WOOD, aBecomes: FIRE, bBecomes: FIRE, chance: 0.02,
    discovery: { name: 'Campfire', science: 'Fire spreads by heating whatever is next to it until that catches too. Wood burns slowly — that is why campfires glow for hours.' } },
  { a: LAVA, b: WOOD, aBecomes: LAVA, bBecomes: FIRE, chance: 0.02,
    discovery: { name: 'Campfire', science: 'Fire spreads by heating whatever is next to it until that catches too. Wood burns slowly — that is why campfires glow for hours.' } },
  { a: FIRE, b: OIL, aBecomes: FIRE, bBecomes: FIRE, chance: 0.6,
    discovery: { name: 'Oil Fire', science: 'Oil catches fire much faster than wood — and it floats on water, so an oil fire can burn right on top of a lake!' } },
  { a: LAVA, b: OIL, aBecomes: LAVA, bBecomes: FIRE, chance: 0.6,
    discovery: { name: 'Oil Fire', science: 'Oil catches fire much faster than wood — and it floats on water, so an oil fire can burn right on top of a lake!' } },
  { a: FIRE, b: PLANT, aBecomes: FIRE, bBecomes: FIRE, chance: 0.06 },
  { a: SEED, b: WATER, aBecomes: PLANT, bBecomes: PLANT, chance: 1,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
  { a: PLANT, b: WATER, aBecomes: PLANT, bBecomes: PLANT, chance: 0.02,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
  { a: LAVA, b: ICE, aBecomes: LAVA, bBecomes: WATER, chance: 0.8,
    discovery: { name: 'Melting', science: 'Heat makes the molecules in ice jiggle faster and faster until they break loose and flow — that is melting!' } },
  { a: FIRE, b: ICE, aBecomes: FIRE, bBecomes: WATER, chance: 0.3,
    discovery: { name: 'Melting', science: 'Heat makes the molecules in ice jiggle faster and faster until they break loose and flow — that is melting!' } },
  { a: STEAM, b: ICE, aBecomes: WATER, bBecomes: ICE, chance: 0.3,
    discovery: { name: 'Rain Maker', science: 'When steam cools down it condenses back into drops of water. That is exactly how clouds make rain!' } },
];

// Which elements show up in the paint palette (the eraser is added by the UI).
export const BRUSH_ELEMENTS: ElementId[] = [SAND, WATER, STONE, WOOD, SEED, ICE, OIL, LAVA, FIRE];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/elements.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore index.html src/elements.ts tests/elements.test.ts
git commit -m "feat: scaffold project and add elements data module"
```

---

### Task 2: Grid module

**Files:**
- Create: `src/engine/grid.ts`
- Test: `tests/grid.test.ts`

**Interfaces:**
- Consumes: `type ElementId` from `src/elements.ts`
- Produces: `class Grid` with:
  - `constructor(width: number, height: number)`
  - fields `width`, `height`, `cells: Uint8Array`, `life: Uint16Array`, `moved: Uint8Array`
  - `index(x, y): number`, `inBounds(x, y): boolean`
  - `get(x, y): ElementId`, `set(x, y, id): void` (set resets `life` to 0)
  - `swap(x1, y1, x2, y2): void` (swaps both `cells` and `life`)
  - `clear(): void`

- [ ] **Step 1: Write the failing test**

`tests/grid.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/grid.test.ts`
Expected: FAIL — cannot resolve `../src/engine/grid`.

- [ ] **Step 3: Write `src/engine/grid.ts`**

```ts
import type { ElementId } from '../elements';

export class Grid {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
  readonly life: Uint16Array;   // frames since a cell was created (for decay)
  readonly moved: Uint8Array;   // per-frame flag: already updated this frame

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = new Uint8Array(width * height);
    this.life = new Uint16Array(width * height);
    this.moved = new Uint8Array(width * height);
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x: number, y: number): ElementId {
    return this.cells[this.index(x, y)];
  }

  set(x: number, y: number, id: ElementId): void {
    const i = this.index(x, y);
    this.cells[i] = id;
    this.life[i] = 0;
  }

  swap(x1: number, y1: number, x2: number, y2: number): void {
    const i = this.index(x1, y1);
    const j = this.index(x2, y2);
    const c = this.cells[i];
    this.cells[i] = this.cells[j];
    this.cells[j] = c;
    const l = this.life[i];
    this.life[i] = this.life[j];
    this.life[j] = l;
  }

  clear(): void {
    this.cells.fill(0);
    this.life.fill(0);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/grid.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/grid.ts tests/grid.test.ts
git commit -m "feat: add typed-array grid"
```

---

### Task 3: Physics — powders and decay

**Files:**
- Create: `src/engine/physics.ts`
- Test: `tests/physics-powder.test.ts`

**Interfaces:**
- Consumes: `Grid` from Task 2; `ELEMENTS`, `EMPTY`, `ElementDef` from Task 1
- Produces:
  - `type Rng = () => number`
  - `stepPhysics(grid: Grid, random?: Rng): void` — one full simulation frame (movement + decay). Task 4 extends this same file with liquid/gas movement; the `updateCell` switch already routes on `def.phase`.

**Movement/decay semantics** (locked in here, relied on by Task 4's code):
- Scan bottom row first (`y` from `height-1` down to `0`), random left/right direction per row; `moved` flags prevent a cell acting twice per frame.
- `tryMove(grid, x, y, nx, ny, def, emptyOnly?)`: moves into EMPTY by swap; otherwise may displace a non-static, non-powder target by density — moving **down** displaces a *lighter* target, moving **up** displaces a *heavier* target. Marks both cells moved. Returns whether it moved.
- Decay: when `life > decay.after`, cell becomes `decay.into` (or `altInto` with probability `altChance`).

- [ ] **Step 1: Write the failing test**

`tests/physics-powder.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/physics-powder.test.ts`
Expected: FAIL — cannot resolve `../src/engine/physics`.

- [ ] **Step 3: Write `src/engine/physics.ts`**

```ts
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

function updateCell(grid: Grid, x: number, y: number, random: Rng): void {
  const i = grid.index(x, y);
  if (grid.moved[i]) return;
  const id = grid.cells[i];
  if (id === EMPTY) return;
  const def = ELEMENTS[id];

  if (def.decay && decayCell(grid, i, def, random)) return;

  if (def.phase === 'powder') movePowder(grid, x, y, def, random);
  // liquid and gas movement arrive in the next task; static never moves
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/physics-powder.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/physics.ts tests/physics-powder.test.ts
git commit -m "feat: powder physics and element decay"
```

---

### Task 4: Physics — liquids and gases

**Files:**
- Modify: `src/engine/physics.ts` (extend `updateCell`, add `moveLiquid`/`moveGas`)
- Test: `tests/physics-fluids.test.ts`

**Interfaces:**
- Consumes: everything Task 3 produced (`stepPhysics`, `tryMove`, `decayCell` all already exist in this file)
- Produces: `stepPhysics` now also moves liquids (fall, diagonal, sideways flow, `flowChance` sluggishness) and gases (rise, diagonal, sideways, bubble up through liquids)

- [ ] **Step 1: Write the failing test**

`tests/physics-fluids.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/physics-fluids.test.ts`
Expected: FAIL — liquids/gases do not move yet (e.g. water stays at `(1, 0)`).

- [ ] **Step 3: Extend `src/engine/physics.ts`**

In `updateCell`, replace the phase dispatch comment/lines with:

```ts
  if (def.phase === 'powder') movePowder(grid, x, y, def, random);
  else if (def.phase === 'liquid') moveLiquid(grid, x, y, def, random);
  else if (def.phase === 'gas') moveGas(grid, x, y, def, random);
  // static never moves
```

Add below `movePowder`:

```ts
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
```

- [ ] **Step 4: Run all physics tests to verify they pass**

Run: `npx vitest run tests/physics-powder.test.ts tests/physics-fluids.test.ts`
Expected: PASS (13 tests) — fluids work and powder behavior unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/engine/physics.ts tests/physics-fluids.test.ts
git commit -m "feat: liquid and gas physics with density displacement"
```

---

### Task 5: Reactions engine with discovery events

**Files:**
- Create: `src/engine/reactions.ts`
- Test: `tests/reactions.test.ts`

**Interfaces:**
- Consumes: `Grid` (Task 2); `ELEMENTS`, `EMPTY`, `REACTIONS` (Task 1); `Rng` (Task 3)
- Produces (Task 6 and Task 8 rely on these exact names):
  - `interface Discovery { name: string; science: string; swatches: [string, string] }` — swatches are the first color of each ingredient element
  - `type DiscoveryListener = (d: Discovery) => void`
  - `stepReactions(grid: Grid, seen: Set<string>, onDiscovery: DiscoveryListener, random?: Rng): void` — applies the reaction table to every adjacent pair; calls `onDiscovery` only for discovery names not in `seen`, and adds them to `seen`

- [ ] **Step 1: Write the failing test**

`tests/reactions.test.ts`:

```ts
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
    stepReactions(g, seen, d => events.push(d), rngZero);
    expect(events.length).toBe(1);
    expect(events[0].name).toBe('Obsidian!');
    expect(events[0].science).toContain('lava');
    expect(events[0].swatches.length).toBe(2);
    // refill and react again — no second event
    g.set(0, 1, LAVA);
    g.set(1, 1, WATER);
    stepReactions(g, seen, d => events.push(d), rngZero);
    expect(events.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reactions.test.ts`
Expected: FAIL — cannot resolve `../src/engine/reactions`.

- [ ] **Step 3: Write `src/engine/reactions.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/reactions.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/reactions.ts tests/reactions.test.ts
git commit -m "feat: data-driven reactions with once-only discovery events"
```

---

### Task 6: Renderer, mouse painting, and the game loop (first playable)

**Files:**
- Create: `src/render.ts`, `src/ui/input.ts`, `src/main.ts`, `src/style.css`
- Modify: `index.html` (add stylesheet link)
- Test: `tests/render.test.ts`, `tests/input.test.ts`

**Interfaces:**
- Consumes: `Grid`, `stepPhysics`, `stepReactions`, `ELEMENTS`, `SAND`, `EMPTY`
- Produces:
  - `render.ts`: `const SCALE = 3`; `hexToRgb(hex): [number, number, number]`; `buildPalette(): Uint8Array[]` (index = element id, 3 bytes per color variant); `class Renderer { constructor(grid, canvas); draw(): void }`
  - `input.ts`: `interface Controls { element: ElementId; radius: number; paused: boolean }`; `paintCircle(grid, cx, cy, radius, id): void`; `attachPainting(canvas, grid, controls): void` (left-drag paints, right-drag erases, strokes interpolated)
  - `main.ts`: wires grid + renderer + loop; exposes nothing

- [ ] **Step 1: Write the failing tests**

`tests/render.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ELEMENTS, SAND } from '../src/elements';
import { buildPalette, hexToRgb } from '../src/render';

describe('render helpers', () => {
  it('hexToRgb parses hex colors', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
  });

  it('buildPalette has 3 bytes per color variant for every element', () => {
    const palette = buildPalette();
    for (const def of Object.values(ELEMENTS)) {
      expect(palette[def.id].length).toBe(def.colors.length * 3);
    }
    const [r, g, b] = hexToRgb(ELEMENTS[SAND].colors[0]);
    expect([...palette[SAND].slice(0, 3)]).toEqual([r, g, b]);
  });
});
```

`tests/input.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/render.test.ts tests/input.test.ts`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Write `src/render.ts`**

```ts
import { ELEMENTS } from './elements';
import type { Grid } from './engine/grid';

export const SCALE = 3;

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// palette[elementId] = flat [r,g,b, r,g,b, ...] for each color variant
export function buildPalette(): Uint8Array[] {
  const palette: Uint8Array[] = [];
  for (const def of Object.values(ELEMENTS)) {
    const arr = new Uint8Array(def.colors.length * 3);
    def.colors.forEach((hex, i) => arr.set(hexToRgb(hex), i * 3));
    palette[def.id] = arr;
  }
  return palette;
}

export class Renderer {
  private readonly palette = buildPalette();
  private readonly small: HTMLCanvasElement;
  private readonly smallCtx: CanvasRenderingContext2D;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;

  constructor(private readonly grid: Grid, private readonly canvas: HTMLCanvasElement) {
    canvas.width = grid.width * SCALE;
    canvas.height = grid.height * SCALE;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.small = document.createElement('canvas');
    this.small.width = grid.width;
    this.small.height = grid.height;
    this.smallCtx = this.small.getContext('2d')!;
    this.image = this.smallCtx.createImageData(grid.width, grid.height);
  }

  draw(): void {
    const { grid, palette } = this;
    const data = this.image.data;
    let o = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++, o += 4) {
        const pal = palette[grid.cells[o >> 2]];
        // position-hashed variant: stable texture, no flicker
        const v = ((x * 7 + y * 13) % (pal.length / 3)) * 3;
        data[o] = pal[v];
        data[o + 1] = pal[v + 1];
        data[o + 2] = pal[v + 2];
        data[o + 3] = 255;
      }
    }
    this.smallCtx.putImageData(this.image, 0, 0);
    this.ctx.drawImage(this.small, 0, 0, this.canvas.width, this.canvas.height);
  }
}
```

- [ ] **Step 4: Write `src/ui/input.ts`**

```ts
import { EMPTY, type ElementId } from '../elements';
import type { Grid } from '../engine/grid';

export interface Controls {
  element: ElementId;
  radius: number;
  paused: boolean;
}

export function paintCircle(
  grid: Grid, cx: number, cy: number, radius: number, id: ElementId,
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= radius * radius && grid.inBounds(cx + dx, cy + dy)) {
        grid.set(cx + dx, cy + dy, id);
      }
    }
  }
}

export function attachPainting(
  canvas: HTMLCanvasElement, grid: Grid, controls: Controls,
): void {
  let painting = false;
  let erasing = false;
  let last: [number, number] | null = null;

  const toCell = (e: PointerEvent): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [
      Math.floor(((e.clientX - rect.left) / rect.width) * grid.width),
      Math.floor(((e.clientY - rect.top) / rect.height) * grid.height),
    ];
  };

  const stroke = (e: PointerEvent): void => {
    const [x, y] = toCell(e);
    const id = erasing ? EMPTY : controls.element;
    if (last) {
      const [lx, ly] = last;
      const steps = Math.max(Math.abs(x - lx), Math.abs(y - ly), 1);
      for (let s = 0; s <= steps; s++) {
        paintCircle(
          grid,
          Math.round(lx + ((x - lx) * s) / steps),
          Math.round(ly + ((y - ly) * s) / steps),
          controls.radius, id,
        );
      }
    } else {
      paintCircle(grid, x, y, controls.radius, id);
    }
    last = [x, y];
  };

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    painting = true;
    erasing = e.button === 2;
    last = null;
    stroke(e);
  });
  window.addEventListener('pointermove', e => {
    if (painting) stroke(e);
  });
  window.addEventListener('pointerup', () => {
    painting = false;
    last = null;
  });
}
```

- [ ] **Step 5: Write `src/main.ts` and `src/style.css`, link stylesheet**

`src/main.ts`:

```ts
import './style.css';
import { SAND } from './elements';
import { Grid } from './engine/grid';
import { stepPhysics } from './engine/physics';
import { stepReactions } from './engine/reactions';
import { Renderer } from './render';
import { attachPainting, type Controls } from './ui/input';

const grid = new Grid(400, 250);
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const renderer = new Renderer(grid, canvas);
const controls: Controls = { element: SAND, radius: 4, paused: false };
const seen = new Set<string>();

attachPainting(canvas, grid, controls);

function simulate(): void {
  stepPhysics(grid);
  stepReactions(grid, seen, () => {}); // journal arrives in Task 8
}

function frame(): void {
  if (!controls.paused) simulate();
  renderer.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

`src/style.css`:

```css
* { box-sizing: border-box; margin: 0; }

body {
  background: #1a1e26;
  color: #e8e6df;
  font-family: 'Comic Sans MS', 'Chalkboard SE', 'Segoe UI', sans-serif;
  height: 100vh;
  overflow: hidden;
}

#app {
  display: flex;
  height: 100vh;
  gap: 12px;
  padding: 12px;
}

#controls {
  width: 170px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

#stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

#world {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  cursor: crosshair;
  image-rendering: pixelated;
}
```

In `index.html`, `main.ts` imports the stylesheet, so no `<link>` tag is needed — leave `index.html` unchanged.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS — all suites (elements, grid, physics ×2, reactions, render, input).

- [ ] **Step 7: Verify in the browser**

Run: `npm run dev` and open the printed URL.
Expected: dark page, canvas visible. Left-drag paints sand that falls and piles. Right-drag erases. (Only sand is paintable until Task 7 adds the palette.)

- [ ] **Step 8: Commit**

```bash
git add src/render.ts src/ui/input.ts src/main.ts src/style.css tests/render.test.ts tests/input.test.ts
git commit -m "feat: renderer, mouse painting, and game loop - first playable"
```

---

### Task 7: Palette and control panel UI

**Files:**
- Create: `src/ui/palette.ts`
- Modify: `src/main.ts` (wire in `buildControls`), `src/style.css` (append control styles)

**Interfaces:**
- Consumes: `BRUSH_ELEMENTS`, `ELEMENTS`, `EMPTY`, `Controls`, `Grid`
- Produces: `buildControls(root: HTMLElement, grid: Grid, controls: Controls, stepOnce: () => void): void` — element buttons (+ eraser), brush-size slider, pause/step, playful clear-world confirm

- [ ] **Step 1: Write `src/ui/palette.ts`**

```ts
import { BRUSH_ELEMENTS, ELEMENTS, EMPTY, type ElementId } from '../elements';
import type { Grid } from '../engine/grid';
import type { Controls } from './input';

export function buildControls(
  root: HTMLElement, grid: Grid, controls: Controls, stepOnce: () => void,
): void {
  const palette = document.createElement('div');
  palette.className = 'palette';
  const buttons = new Map<ElementId, HTMLButtonElement>();

  const pick = (id: ElementId): void => {
    controls.element = id;
    for (const [bid, btn] of buttons) btn.classList.toggle('selected', bid === id);
  };

  for (const id of [...BRUSH_ELEMENTS, EMPTY]) {
    const def = ELEMENTS[id];
    const btn = document.createElement('button');
    btn.className = 'element-btn';
    const label = id === EMPTY ? 'Eraser' : def.name;
    const swatchColor = id === EMPTY ? '#1a1e26' : def.colors[0];
    btn.innerHTML = `<span class="swatch" style="background:${swatchColor}"></span>${label}`;
    btn.addEventListener('click', () => pick(id));
    buttons.set(id, btn);
    palette.appendChild(btn);
  }
  root.appendChild(palette);
  pick(controls.element);

  const brush = document.createElement('label');
  brush.className = 'brush';
  brush.innerHTML = `Brush size <input type="range" min="1" max="20" value="${controls.radius}">`;
  brush.querySelector('input')!.addEventListener('input', e => {
    controls.radius = Number((e.target as HTMLInputElement).value);
  });
  root.appendChild(brush);

  const row = document.createElement('div');
  row.className = 'buttons';

  const pause = document.createElement('button');
  pause.textContent = '⏸ Pause';
  pause.addEventListener('click', () => {
    controls.paused = !controls.paused;
    pause.textContent = controls.paused ? '▶ Play' : '⏸ Pause';
  });

  const step = document.createElement('button');
  step.textContent = '⏭ Step';
  step.addEventListener('click', () => {
    if (controls.paused) stepOnce();
  });

  const clear = document.createElement('button');
  clear.textContent = '🧹 Fresh world';
  clear.addEventListener('click', () => openClearConfirm(grid));

  row.append(pause, step, clear);
  root.appendChild(row);
}

function openClearConfirm(grid: Grid): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="dialog">
      <p>Start a fresh world? Your discoveries stay safe in your journal! ✨</p>
      <div class="dialog-buttons">
        <button class="yes">Fresh world</button>
        <button class="no">Keep playing</button>
      </div>
    </div>`;
  overlay.querySelector('.yes')!.addEventListener('click', () => {
    grid.clear();
    overlay.remove();
  });
  overlay.querySelector('.no')!.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}
```

- [ ] **Step 2: Wire into `src/main.ts`**

Add import:

```ts
import { buildControls } from './ui/palette';
```

After the `attachPainting(canvas, grid, controls);` line, add:

```ts
buildControls(
  document.querySelector<HTMLElement>('#controls')!,
  grid, controls, simulate,
);
```

(`simulate` is already defined; function hoisting makes the ordering fine, but keep the call after `attachPainting` for readability.)

- [ ] **Step 3: Append control styles to `src/style.css`**

```css
.palette {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.element-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 6px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: #262b36;
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.element-btn.selected {
  border-color: #ffd54d;
  background: #303748;
}

.swatch {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
  border: 1px solid #00000055;
}

.brush {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.buttons button {
  padding: 10px;
  border: none;
  border-radius: 10px;
  background: #262b36;
  color: inherit;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.buttons button:hover {
  background: #303748;
}

.overlay {
  position: fixed;
  inset: 0;
  background: #000000aa;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.dialog {
  background: #262b36;
  border-radius: 16px;
  padding: 24px;
  max-width: 420px;
  text-align: center;
  font-size: 16px;
}

.dialog-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 16px;
}

.dialog button {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: #3f76d4;
  color: white;
  font: inherit;
  cursor: pointer;
}

.dialog button.no {
  background: #444b5c;
}
```

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev` (or reuse the running server) and check:
- All 9 element buttons + Eraser render with color swatches; clicking selects (yellow outline) and paints that element.
- Water flows and levels; lava oozes slowly; oil floats on water; sand sinks through water; fire flickers out; steam rises. Lava + water leaves black obsidian.
- Brush slider changes stroke size. Pause freezes the world; Step advances one frame while paused.
- 🧹 Fresh world shows the playful confirm; "Fresh world" clears, "Keep playing" cancels. Nothing about the dialog reads as scary/destructive.

Run: `npx vitest run` — all tests still PASS (UI changes touched no engine code).

- [ ] **Step 5: Commit**

```bash
git add src/ui/palette.ts src/main.ts src/style.css
git commit -m "feat: element palette, brush, pause/step, and playful clear confirm"
```

---

### Task 8: Discovery journal — store, toast, and journal page

**Files:**
- Create: `src/ui/journal.ts`
- Modify: `src/main.ts` (journal replaces the bare `seen` set), `src/style.css` (append toast/journal styles)
- Test: `tests/journal.test.ts`

**Interfaces:**
- Consumes: `Discovery` from `src/engine/reactions.ts`
- Produces:
  - `interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void }`
  - `class Journal { constructor(storage: StorageLike); readonly entries: Discovery[]; readonly seen: Set<string>; record(d: Discovery): void }` — `record` dedupes by name and persists to key `sand-magic-journal`; corrupt/blocked storage never throws
  - `showToast(d: Discovery): void`
  - `buildJournalUI(root: HTMLElement, journal: Journal): void`

- [ ] **Step 1: Write the failing test**

`tests/journal.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Discovery } from '../src/engine/reactions';
import { Journal, type StorageLike } from '../src/ui/journal';

const fakeStorage = (initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } => ({
  data: { ...initial },
  getItem(k) { return this.data[k] ?? null; },
  setItem(k, v) { this.data[k] = v; },
});

const obsidian: Discovery = {
  name: 'Obsidian!',
  science: 'Lava + water = volcanic glass.',
  swatches: ['#e2571e', '#3f76d4'],
};

describe('Journal', () => {
  it('records a discovery and persists it', () => {
    const storage = fakeStorage();
    const j = new Journal(storage);
    j.record(obsidian);
    expect(j.entries).toEqual([obsidian]);
    expect(j.seen.has('Obsidian!')).toBe(true);
    expect(JSON.parse(storage.data['sand-magic-journal'])).toEqual([obsidian]);
  });

  it('dedupes by name', () => {
    const j = new Journal(fakeStorage());
    j.record(obsidian);
    j.record({ ...obsidian, science: 'different text' });
    expect(j.entries.length).toBe(1);
  });

  it('loads existing entries on construction', () => {
    const storage = fakeStorage({ 'sand-magic-journal': JSON.stringify([obsidian]) });
    const j = new Journal(storage);
    expect(j.entries.length).toBe(1);
    expect(j.seen.has('Obsidian!')).toBe(true);
  });

  it('survives corrupt storage', () => {
    const j = new Journal(fakeStorage({ 'sand-magic-journal': 'not json{{{' }));
    expect(j.entries).toEqual([]);
  });

  it('survives a throwing storage', () => {
    const broken: StorageLike = {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
    };
    const j = new Journal(broken);
    j.record(obsidian); // must not throw
    expect(j.entries.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/journal.test.ts`
Expected: FAIL — cannot resolve `../src/ui/journal`.

- [ ] **Step 3: Write `src/ui/journal.ts`**

```ts
import type { Discovery } from '../engine/reactions';

const KEY = 'sand-magic-journal';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export class Journal {
  readonly entries: Discovery[] = [];
  readonly seen = new Set<string>();

  constructor(private readonly storage: StorageLike) {
    try {
      const raw = storage.getItem(KEY);
      if (raw) {
        for (const d of JSON.parse(raw) as Discovery[]) {
          this.entries.push(d);
          this.seen.add(d.name);
        }
      }
    } catch {
      // corrupt or blocked storage: start with an empty journal, never crash
    }
  }

  record(d: Discovery): void {
    if (this.seen.has(d.name)) return;
    this.seen.add(d.name);
    this.entries.push(d);
    try {
      this.storage.setItem(KEY, JSON.stringify(this.entries));
    } catch {
      // storage blocked: keep the in-memory journal for this session
    }
  }
}

export function showToast(d: Discovery): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = `✨ You discovered ${d.name}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

export function buildJournalUI(root: HTMLElement, journal: Journal): void {
  const open = document.createElement('button');
  open.id = 'journal-btn';
  open.textContent = '📖 Journal';
  open.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const cards = journal.entries.map(d => `
      <div class="card">
        <div class="card-title">
          <span class="swatch" style="background:${d.swatches[0]}"></span>
          <span class="swatch" style="background:${d.swatches[1]}"></span>
          <strong>${d.name}</strong>
        </div>
        <p>${d.science}</p>
      </div>`).join('');
    overlay.innerHTML = `
      <div class="dialog journal">
        <h2>My Discoveries</h2>
        <div class="cards">${cards || '<p>Nothing here yet — mix things together and see what happens!</p>'}</div>
        <button class="no">Back to playing</button>
      </div>`;
    overlay.querySelector('.no')!.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  });
  root.appendChild(open);
}
```

Note the journal page renders only found entries — no counters, no empty slots (global constraint).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/journal.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire into `src/main.ts`**

Replace the `const seen = new Set<string>();` line with:

```ts
const journal = new Journal(localStorage);
```

Add imports:

```ts
import { buildJournalUI, Journal, showToast } from './ui/journal';
```

Replace the `simulate` function with:

```ts
function simulate(): void {
  stepPhysics(grid);
  stepReactions(grid, journal.seen, d => {
    journal.record(d);
    showToast(d);
  });
}
```

After the `buildControls(...)` call, add:

```ts
buildJournalUI(document.querySelector<HTMLElement>('#controls')!, journal);
```

(Passing `journal.seen` into `stepReactions` means already-journaled discoveries never re-fire, even across page reloads.)

- [ ] **Step 6: Append toast/journal styles to `src/style.css`**

```css
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #ffd54d;
  color: #1a1e26;
  padding: 12px 22px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: bold;
  z-index: 20;
  animation: toast-pop 4s ease forwards;
  pointer-events: none;
}

@keyframes toast-pop {
  0% { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(0.9); }
  8% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1.05); }
  12% { transform: translateX(-50%) scale(1); }
  85% { opacity: 1; }
  100% { opacity: 0; }
}

#journal-btn {
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: #6a4fb3;
  color: white;
  font: inherit;
  font-size: 15px;
  cursor: pointer;
}

.dialog.journal {
  max-width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.cards {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
  background: #303748;
  border-radius: 12px;
  padding: 12px 14px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.card p {
  font-size: 14px;
  line-height: 1.45;
}
```

- [ ] **Step 7: Verify in the browser**

Run: `npm run dev`. Pour water onto lava:
- A "✨ You discovered Obsidian!" toast pops once (and never again for obsidian).
- 📖 Journal shows the card with two ingredient swatches and the science line.
- Reload the page → journal still has the entry, and re-making obsidian shows no new toast.
- Empty journal (fresh browser profile / cleared storage) shows the friendly "Nothing here yet" line — no counters anywhere.

Run: `npx vitest run` — all suites PASS.

- [ ] **Step 8: Commit**

```bash
git add src/ui/journal.ts src/main.ts src/style.css tests/journal.test.ts
git commit -m "feat: discovery journal with toasts and localStorage persistence"
```

---

### Task 9: Title, GitHub Pages deploy, README

**Files:**
- Create: `vite.config.ts`, `.github/workflows/deploy.yml`, `README.md`
- Modify: `index.html` (page title bar), `src/style.css` (title style)

**Interfaces:**
- Consumes: the finished app
- Produces: a deployable static build at base path `/sand-magic/`

- [ ] **Step 1: Add the in-page title**

In `index.html`, at the top of `<aside id="controls">`:

```html
<aside id="controls">
  <h1 id="title">Sand Magic ✨</h1>
</aside>
```

Append to `src/style.css`:

```css
#title {
  font-size: 22px;
  text-align: center;
  background: linear-gradient(90deg, #ffd54d, #f06c24, #3f76d4);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

- [ ] **Step 2: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/sand-magic/',
});
```

- [ ] **Step 3: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Create `README.md`**

```markdown
# Sand Magic ✨

A falling-sand science playground. Paint sand, water, lava, fire and more —
watch real physics happen, and collect surprise discoveries in your journal.

Built by Dad & daughter. Science is magical.

## Play

npm install
npm run dev

## The magic ingredients file

Want to change a color, invent an element, or make up a new reaction?
Everything lives in [`src/elements.ts`](src/elements.ts). Change it, save,
and the game reloads.

## Tests

npm test
```

- [ ] **Step 5: Verify build and tests**

Run: `npm test && npm run build`
Expected: all tests PASS; `vite build` emits `dist/` with no TypeScript errors.

Run: `npm run preview` and open the printed URL + `/sand-magic/`.
Expected: game works from the production build.

- [ ] **Step 6: Commit**

```bash
git add index.html src/style.css vite.config.ts .github/workflows/deploy.yml README.md
git commit -m "feat: title, GitHub Pages deploy workflow, README"
```

- [ ] **Step 7: (Manual, needs user) Create GitHub repo and push**

The repo owner creates `slaterhaus/sand-magic` (or their chosen name), enables Pages with "GitHub Actions" as the source, then:

```bash
git remote add origin git@github.com:slaterhaus/sand-magic.git
git push -u origin main
```

If the repo name differs from `sand-magic`, update `base` in `vite.config.ts` to match.

---

## Verification checklist (whole project)

- `npm test` → all suites pass (elements, grid, physics-powder, physics-fluids, reactions, render, input, journal)
- `npm run build` → clean TypeScript + Vite build
- Manual play: sand piles, water levels, oil floats on water, sand sinks in water, lava oozes and makes obsidian + steam on water contact, fire spreads along wood leaving ash, seeds sprout in water, steam rises and rains back down, ice melts near fire/lava
- Journal: toast once per discovery, cards persist across reloads, no counters/empty slots anywhere
- Final verifier: an 8-year-old
