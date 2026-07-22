# Science Magic rename + responsive/phone support — Design Spec

**Date:** 2026-07-22
**Status:** Approved, pending self-review
**Audience:** Thomas (builder) + daughter (player)

## What this is

Two small, independent changes to the already-shipped falling-sand game:

1. Rename the game's visible branding from "Sand Magic" to "Science Magic" (her preferred name).
2. Make it playable on a phone: responsive layout, touch-safe input, no accidental page scroll/zoom while painting.

Neither change touches the physics engine, reactions, or journal — this is UI/CSS/markup only.

## 1. Rename

Change to "Science Magic ✨" in:
- `index.html`: `<title>` and `<h1 id="title">`
- `README.md`: top heading

**Explicitly unchanged** (internal plumbing, not user-visible, changing them risks breakage for no benefit):
- GitHub repo name/URL (`slaterhaus/sand-magic`, `slaterhaus.github.io/sand-magic/`)
- Local project folder name
- `vite.config.ts` `base: '/sand-magic/'`
- `package.json` `name: "sand-magic"`
- localStorage key `sand-magic-journal` (renaming would silently drop any journal already saved in a browser)

## 2. Responsive layout

**Approach: CSS-only reflow via a media query, zero new components.**

`#app` in `src/style.css` currently is `display: flex; flex-direction: row` unconditionally — `#controls` (fixed-width sidebar) beside `#stage` (canvas). Add:

```css
@media (max-width: 768px) {
  #app { flex-direction: column; }
  #stage { flex: 0 0 55%; }
  #controls { flex: 1; overflow-y: auto; width: auto; }
}
```

This stacks canvas-on-top (~55% of viewport height) with controls (palette, brush slider, pause/step/clear buttons, journal button) scrolling below, full width. Same DOM, same `buildControls`/`buildJournalUI`/`Renderer`/`attachPainting` code — only the CSS box layout changes.

No orientation lock: the stacked layout applies at any viewport under the breakpoint, portrait or landscape. No JS-based orientation detection or a second landscape layout.

## 3. Touch input

`attachPainting` (`src/ui/input.ts`) already binds `pointerdown`/`pointermove`/`pointerup`, which unify mouse, touch, and pen — finger-drag painting already works with no code change.

Erasing on touch: no new gesture. The Eraser is already a palette button (`src/ui/palette.ts`, added when `BRUSH_ELEMENTS` + `EMPTY` render as buttons) — tapping it selects `EMPTY` as `controls.element`, then painting erases, identical flow to selecting any other element. Right-click-to-erase on desktop is unaffected and remains a shortcut on top of this, not replaced.

**Two hardening changes needed**, since without them a touch drag can be hijacked by the browser's native scroll/zoom instead of reaching the canvas:

- `index.html` viewport meta: add `user-scalable=no, maximum-scale=1` so accidental double-tap/pinch doesn't zoom the page.
- `src/style.css`: add `touch-action: none` to `#world` so the browser doesn't try to pan/scroll the page while a finger drags across the canvas.

## 4. Touch target sizing

Inside the same `@media (max-width: 768px)` block, add `min-height: 44px` to `.element-btn`, `.buttons button`, `#journal-btn`, and `.mute-btn` — the standard minimum recommended touch target size, since current button padding was sized for a mouse cursor.

## 5. Brush size

Unchanged. Same 1–20 slider range, same default radius. The rendered grid is fixed-pixel-scale regardless of screen size, so no touch-specific adjustment is needed.

## Testing

No new unit-testable logic — this is CSS, one HTML meta tag, and confirming existing pointer-event code already covers touch. Verification is manual:
- Resize the browser below 768px width and confirm the stacked reflow (canvas ~55% height on top, controls scrollable below).
- Use Chrome DevTools' device toolbar (touch simulation) to confirm dragging on the canvas paints without scrolling the page, and that tapping Eraser then dragging erases.
- Confirm existing `npm test` suite (46 tests) still passes unchanged — no engine/logic files touched.
- Confirm `npm run build` still succeeds with no TypeScript errors.

## Out of scope

Landscape-specific layout, orientation lock, touch-specific brush defaults, PWA/installable-app support, haptics. None of these were requested; the "portrait-only, CSS reflow" approach intentionally keeps this to one layout to build and test.
