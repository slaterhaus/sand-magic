# Plant variety: weighted-random sprout outcomes — Design Spec

**Date:** 2026-07-22
**Status:** Approved, pending self-review
**Audience:** Thomas (builder) + daughter (player)

## What this is

When a seed sprouts (`SEED + WATER` or `SEED + DIRT`), it currently always becomes the same generic `PLANT`, which grows as a single column straight up to a fixed height. This adds variety: the sprouting seed randomly becomes one of four plant types — **Grass** (common), **Shrub** (common), **Flower** (uncommon), **Tree** (rare) — each with its own color and max height, decided once at the moment it sprouts. Every plant then grows exactly as today (straight-up single-column, capped height) — no branching, no canopy shapes, no new growth mechanics.

This requires one small, reusable addition to the reaction engine: a `Reaction` can declare a weighted-random outcome instead of a single fixed element, resolved once per reaction firing.

## Data model change

`src/elements.ts`'s `Reaction` interface gains an optional way to express "pick one of these, weighted":

```ts
export interface WeightedOutcome {
  into: ElementId;
  weight: number;
}

export interface Reaction {
  a: ElementId;
  b: ElementId;
  aBecomes: ElementId | WeightedOutcome[];  // NEW: either side may be a weighted pick
  bBecomes: ElementId | WeightedOutcome[];
  chance: number;
  discovery?: { name: string; science: string };
}
```

**Both `aBecomes` and `bBecomes` need the array form, not just one side.** `REACTIONS` entries get auto-mirrored by `reactions.ts` into both touch-orderings — `pairKey(a,b)` and `pairKey(b,a)`, with the mirror swapping which slot holds which value (existing code, unchanged by this spec). Checking the current data confirms there's no fixed convention for which slot the "thing being decided" occupies: `SEED + WATER` has the Seed as `a` (`aBecomes: PLANT`), while `SEED + DIRT` also has the Seed as `a` (`aBecomes: PLANT`, `bBecomes: DIRT`) — but `FIRE + PLANT` has the Plant as `b`, and `PLANT + WATER` has the Plant as `a`. Since a reaction can be written with either element first, and the mirror registration is generic (it doesn't know which side is "special"), the weighted-outcome capability must be available on both slots symmetrically. This keeps the common case (`aBecomes: SOME_ID, bBecomes: SOME_ID`) exactly as simple as today, with either slot optionally opting into a weighted array.

## Reaction engine change

`src/engine/reactions.ts`'s `Rule.aBecomes` and `Rule.bBecomes` both become `ElementId | WeightedOutcome[]`. In `tryReact`, resolve each independently, once, at fire-time:

```ts
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
```

**Bidirectional registration stays correct without special-casing:** the existing mirror-registration code just copies whichever value — a plain `ElementId` or a `WeightedOutcome[]` — sits in each slot into the swapped position. Since `tryReact` now calls `resolveOutcome` on both `aBecomes` and `bBecomes` independently regardless of which one is an array, no changes are needed to the mirroring logic itself, only to the type it carries.

Discovery firing is unaffected — one `Discovery` per reaction (not one per possible outcome), matching how Melting/Sprout!/Dissolved! already share one discovery across multiple trigger reactions today.

## New elements

`PLANT` (id 8) is renamed to `GRASS` and becomes the common outcome — same id, same `growsInto` shape, so nothing referencing it elsewhere (e.g. `Fire + Plant` burns) needs to change except the constant's name and its color/height. Three new element ids are added:

| Element | Rarity (weight) | Color | Max height | Notes |
|---|---|---|---|---|
| **Grass** *(was Plant)* | Common (50) | `#3e9d3e`/`#46ac46`/`#358a35` (unchanged) | 4 (was 6 — grass is short) | |
| **Shrub** | Common (30) | `#2f6b3a`/`#275a30` (darker, bushier green) | 5 | |
| **Flower** | Uncommon (15) | `#3e9d3e` stem-green base + `#e85d9c`/`#f0c445`/`#9a6fd6` bloom shades | 5 | Same `growsInto` mechanic; the extra bloom colors just add texture via the existing position-hashed color-variant rendering — no new rendering code needed. |
| **Tree** | Rare (5) | `#4a3420`/`#3d2a18` (trunk-brown, darker/thicker-reading than Wood) | 10 (tallest) | The "jackpot" outcome — visibly the tallest thing that can grow. |

Weights (50/30/15/5, total 100) approximate: roughly half grass, ~30% shrub, ~15% flower, 5% (1-in-20) tree — matches the "common/common/uncommon/rare" framing approved earlier.

None of the four are added to `BRUSH_ELEMENTS` — like today's `PLANT`, they're sprout-only outcomes, not directly paintable (a seed is still what you paint).

## Reaction changes

Checking the current data precisely: `SEED + WATER` today is `aBecomes: PLANT, bBecomes: PLANT` (both cells become Plant — Water is consumed too), while `SEED + DIRT` is `aBecomes: PLANT, bBecomes: DIRT` (only the seed's cell becomes Plant; Dirt is correctly left untouched). These two aren't consistent with each other today, and this spec fixes that inconsistency as part of adding variety: in both reactions, only the Seed's own cell (`aBecomes`, since Seed is written as `a` in both entries) becomes the weighted plant pick, and the partner (`bBecomes`) stays itself — Water remains Water, Dirt remains Dirt, matching real behavior (a seed uses water/soil to grow; it doesn't consume the water outright).

```ts
const SPROUT_OUTCOMES: WeightedOutcome[] = [
  { into: GRASS, weight: 50 },
  { into: SHRUB, weight: 30 },
  { into: FLOWER, weight: 15 },
  { into: TREE, weight: 5 },
];

{ a: SEED, b: WATER, aBecomes: SPROUT_OUTCOMES, bBecomes: WATER, chance: 1, discovery: {...same Sprout! text...} },
{ a: SEED, b: DIRT, aBecomes: SPROUT_OUTCOMES, bBecomes: DIRT, chance: 1, discovery: {...same Sprout! text...} },
```

This is a small bugfix (Water no longer vanishes when a seed sprouts in it) riding along with this feature — called out explicitly per user-instruction norms about surfacing incidental fixes rather than silently bundling them.

The existing `PLANT + WATER → PLANT + PLANT` (chance 0.02, reusing "Sprout!") reaction models a grown plant slowly spreading into adjacent water — unlike the seed-consuming-water case above, this one reads as an intentional "plants spread toward water" mechanic, not a typo, so it is **not** changed by this spec. It's extended to cover the new variants: four mirrored entries (`GRASS+WATER`, `SHRUB+WATER`, `FLOWER+WATER`, `TREE+WATER`), each keeping the existing shape exactly (`aBecomes` the same type, `bBecomes` the same type — i.e. water still becomes more of that plant type), same chance, same discovery text. This preserves today's spreading behavior for every variant rather than just grass.

`Fire + Plant` (chance 0.06, no discovery) becomes `Fire + Grass`/`Fire + Shrub`/`Fire + Flower` at the same chance — three quick-burning variants, unchanged behavior, just each variant covered. **`Fire + Tree`** is separate, per the approved slow-burn decision: mirrors `Fire + Wood`'s existing 0.02 chance instead of 0.06, so a rare Tree burns like Wood (slowly) rather than like grass (fast) — a tree realistically shouldn't catch as fast as grass. `Lava + Tree` similarly mirrors `Lava + Wood`'s 0.02 chance (igniting into Fire), matching the Wood pattern exactly.

## Explicitly out of scope

- No branching, canopy, or leaf-cluster shapes — every variant grows as a single column, exactly like today's Plant, just to a different height and color.
- No changes to `src/engine/physics.ts`'s `growCell` — the existing straight-up growth mechanic is reused unchanged for all four variants.
- No UI/palette changes — seeds are still what's painted; the variety is a sprouting-time surprise, matching the "science is magical" discovery-driven design principle from the original spec.
- No rebalancing of unrelated existing reactions or elements — only the sprouting reactions, the Plant→Grass rename/re-tune, and the two called-out Tree-specific burn rates change.

## Testing

- `tests/elements.test.ts`'s existing generic reaction-validity test (every reaction references defined elements with a valid chance) needs a small update: it currently assumes both `aBecomes` and `bBecomes` are always a plain `ElementId` (it looks each up directly in `ELEMENTS`). Update it to handle the `WeightedOutcome[]` case on either side — validate every `into` in the array is a defined element, and every `weight` is a positive number.
- New test: `resolveOutcome` (or equivalent) with a fixed weighted list and a deterministic rng — confirm rolling near 0 returns the first (most common) outcome, rolling near the top of the total returns the last (rarest) outcome, and the distribution boundaries match the declared weights.
- New test: firing `SEED + WATER` with a deterministic rng that forces the "rare" branch produces `TREE`, and one that forces the "common" branch produces `GRASS` — confirming the resolved outcome actually lands in the grid cell, not just returned correctly from the helper.
- Existing `tests/physics-growth.test.ts` (plant growth) needs no changes — it tests `growCell` generically via `growsInto`, which every new variant reuses unchanged.
- Manual verification: sprout enough seeds to visually see all four outcomes appear (grass most often, tree rarely), confirm each grows to its correct capped height, confirm Fire burns Grass/Shrub/Flower quickly but Tree slowly like Wood, confirm the journal still shows one "Sprout!" card regardless of which variant resulted.
