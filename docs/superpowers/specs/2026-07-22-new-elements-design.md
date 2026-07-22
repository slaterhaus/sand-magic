# New elements: Snow, Metal, Glass, Acid, Dirt — Design Spec

**Date:** 2026-07-22
**Status:** Approved, pending self-review
**Audience:** Thomas (builder) + daughter (player)

## What this is

Pure content addition to `src/elements.ts` — five new elements and their reactions, using only mechanics the engine already supports (phase movement, density displacement, `decay`, `growsInto`, `condenseNearTop`, and pairwise `Reaction`s). No engine/physics/reactions-module code changes. Same pattern as the original 11 elements.

Element count goes from 13 (11 base + Ash + Obsidian) to 20 (16 base + Ash, Obsidian, Rust, Glass — Rust and Glass are new *derived* elements, like Obsidian was for the original set).

## New elements

| Element | Phase | Density | Notes |
|---|---|---|---|
| **Snow** | powder | 800 | Falls and piles like sand (lighter, so it sits *above* sand if both are poured in the same spot); visually a bright white powder. |
| **Metal** | static | 9999 | Inert like stone/wood by default — a buildable material for the "engineer, what can you make" angle. |
| **Dirt** | powder | 1400 | Falls and piles between sand (1600) and snow (800) in density; visually brown. |
| **Acid** | liquid | 1050 | Slightly denser than water (1000) so it sinks below water if poured together — a deliberate "don't let it reach the bottom" tension. Bright green. |
| **Glass** *(derived only — not in the paint palette)* | static | 9999 | Produced by Sand + Fire. Pale, semi-translucent-looking color distinct from Stone/Obsidian. |
| **Rust** *(derived only — not in the paint palette)* | static | 9999 | Produced by Metal + Water over time. Reddish-brown, visually distinct from Metal. |

`BRUSH_ELEMENTS` gains Snow, Metal, Dirt, Acid (4 new palette buttons — Glass and Rust stay discovery-only, matching how Ash/Obsidian aren't paintable either, keeping the palette from growing every time a new *derived* element appears).

## New reactions

| Reaction | Chance | Discovery | Science note (kid-friendly) |
|---|---|---|---|
| Fire + Sand → Fire + Glass | 0.03 | **Glass!** | Sand is mostly a mineral called silica — enough heat melts it into glass, the same way glassblowers make bottles and windows. |
| Lava + Sand → Lava + Glass | 0.03 | **Glass!** | (same discovery, shared text — matches the existing pattern where Campfire/Melting/Sprout! share text across trigger pairs) |
| Metal + Water → Metal + Rust | 0.01 | **Rusty!** | When metal sits in water a long time, it slowly reacts with the air and water to form rust — a new, weaker material. That's why old ships and playground equipment turn orange-brown. |
| Acid + Stone → Acid + EMPTY | 0.05 | **Dissolved!** | Acid is a liquid that can slowly break the bonds holding a solid together, eating through it bit by bit. Strong acids can dissolve rock over hundreds of years — it's how some caves form! |
| Acid + Wood → Acid + EMPTY | 0.05 | **Dissolved!** | (same discovery text) |
| Acid + Metal → Acid + EMPTY | 0.05 | **Dissolved!** | (same discovery text) |
| Fire + Snow → Fire + Water | 0.3 | **Melting** | (reuses the existing "Melting" discovery — snow is just packed ice crystals, so it melts the same way) |
| Lava + Snow → Lava + Water | 0.8 | **Melting** | (reuses existing "Melting" discovery) |
| Seed + Dirt → Plant + Dirt | 1.0 | **Sprout!** | (reuses existing "Sprout!" discovery — planting in dirt is the natural complement to planting in water) |

Notes on chances, calibrated against the existing table for consistency:
- Glass-making at 0.03 matches Campfire's 0.02–0.03 range — a deliberate, visible-but-not-instant burn-through effect.
- Rusting at 0.01 is intentionally the slowest reaction in the game (slower than Campfire) — rust should visibly take a long time, reinforcing "this happens over years" from the science note.
- Dissolving at 0.05 is faster than rusting but still gradual — acid should visibly eat into a stone wall over a few seconds, not vanish it instantly.
- Snow melting mirrors Ice's existing chances exactly (Fire+Ice was 0.3, Lava+Ice was 0.8) since snow uses the same melting concept.

Acid deliberately does **not** react with itself, Water, Sand, Glass, Obsidian, Rust, Seed, or Plant — keeping its "corrosive to solids" identity focused rather than dissolving everything, so pouring it into a pool of water or onto sand is safe and lets her use it surgically on a stone wall.

## Explicitly out of scope

- No new `Phase` values, no new `ElementDef` fields, no changes to `src/engine/physics.ts` or `src/engine/reactions.ts` — everything here is expressible with what those modules already support.
- No changes to the palette UI component, journal component, or CSS beyond what naturally follows from `BRUSH_ELEMENTS` growing by 4 (the palette grid already wraps automatically).
- No rebalancing of *existing* elements/reactions — only additions.

## Testing

`tests/elements.test.ts` already asserts structural invariants generically (every `ELEMENTS` key matches its `id`, every color is valid hex, every `REACTIONS` entry references defined elements with a valid chance, every `BRUSH_ELEMENTS` entry is defined and isn't the eraser) — these tests need no changes and will automatically validate the new entries. No new test file is needed; this is data, not logic.

Manual verification: paint each new element, confirm falling/piling/flowing behavior matches its phase and density relative to existing elements (snow floats visually above sand, acid sinks below water), and trigger each new reaction to confirm the discovery toast/journal card appears with correct text.
