# Sand Magic — Design Spec

**Date:** 2026-07-19
**Status:** Approved approach (Option A), pending spec review
**Audience:** Thomas (builder) + daughter (~8, player and occasional co-tweaker)

## What this is

A falling-sand physics sandbox web game for an 8-year-old who loves volcanoes,
natural disasters, and Minecraft. She paints elements onto a canvas and watches
real physical properties (density, flammability, heat) drive surprising
interactions. First-time reactions are collected in a **discovery journal**
with one-sentence real-science notes — "science is magical" by surprise, not by
lesson. No goals, no scores, no failure states (deliberate: perfectionism-safe).

Primary device: laptop/desktop, mouse-driven. Delivered as a static site
(GitHub Pages), same hosting pattern as pattern-drill.

## Architecture (Option A — approved)

- **Stack:** vanilla TypeScript + Vite, Canvas 2D. No framework, no WASM.
- **World:** fixed grid (~400×250 cells) stored in typed arrays
  (`Uint8Array` for element id; parallel arrays for per-cell state like
  lifetime/temperature where needed).
- **Sim loop:** each animation frame, iterate cells bottom-up (alternating
  left/right scan direction to avoid bias) applying per-element rules:
  gravity for powders, spreading for liquids, rising for gases, spreading for
  fire. Target 60fps; grid size is small enough that this is comfortable on a
  laptop.
- **Rendering:** write element colors into an `ImageData` buffer, blit to
  canvas scaled up with crisp pixels (`image-rendering: pixelated`).
- **The engine never hardcodes element names.** All behavior is driven by data
  in `src/elements.ts`.

## Components

| Unit | Purpose | Depends on |
|---|---|---|
| `src/elements.ts` | **The tweak point.** Plain literal data: elements (name, color(s), phase, density, flammability, heat behavior) and a reactions table (`water + lava → stone + steam`, journal text). Heavily commented for co-editing sessions. | nothing |
| `src/engine/grid.ts` | Typed-array world state; get/set cells, bounds. | nothing |
| `src/engine/physics.ts` | Movement rules per phase: powder falls/piles, liquid levels out, gas rises, static stays. Density decides who sinks past whom (oil floats on water). | grid, elements |
| `src/engine/reactions.ts` | Applies the reactions table when neighbors touch; emits a `discovery` event the first time each reaction fires. | grid, elements |
| `src/render.ts` | Grid → ImageData → canvas. | grid, elements |
| `src/ui/palette.ts` | Left-side element palette (big colorful swatches), brush-size slider, pause/step, playful clear-world confirm. | elements |
| `src/ui/input.ts` | Mouse painting (left = paint, right = erase), brush circle preview. | grid |
| `src/ui/journal.ts` | Discovery toast ("✨ You discovered Obsidian!") + journal page of discovery cards with science one-liners. Persists to localStorage. | reactions events |
| `src/main.ts` | Wires everything; game loop. | all |

## Element set (v1)

sand, water, stone (wall), lava, fire, wood, seed, plant, steam, ice, oil —
plus derived: ash, obsidian.

Key reactions (each is a journal discovery):

- lava + water → obsidian + steam — "how new islands form"
- fire + wood → fire, leaves ash
- fire + oil → fire (oil also floats on water: density)
- seed + water → plant grows upward
- steam rises; condenses back to water at the top (tiny water cycle)
- ice melts near heat (one-way in v1; freezing can arrive later as a "frost"
  element)
- plant + fire → fire + ash

## Discovery journal

- First firing of each reaction: non-blocking toast + card added to journal.
- Card: element/reaction name, pixel-art swatch of the ingredients, one
  kid-friendly real-science sentence.
- Journal opens from a book icon; shows only what's been found (no empty
  slots, no "12/30 found" — no completion pressure).
- Persistence: localStorage (single-player, single-machine; no accounts).

## Error handling

Almost none needed by design: fixed-size grid, no network, no user text input.
localStorage read wrapped in try/catch (corrupt/blocked storage → start with
empty journal, never crash).

## Testing & verification

- Vitest unit tests for the deterministic core: sand falls and piles, water
  levels out, density ordering (oil over water), each reaction in the table
  produces its outputs, discovery event fires exactly once per reaction.
- Feel (brush, colors, fire spread rate) verified by playing; final verifier
  is an 8-year-old.

## Out of scope for v1

Touch/tablet support, challenges/quests, element discovery via crafting menu
(Little Alchemy layer), engineering contraptions, sound, accounts/sharing.
The v1 architecture (data-driven elements, event-driven journal) is the
foundation those can layer onto later.
