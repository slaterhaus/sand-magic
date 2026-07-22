import { describe, expect, it } from 'vitest';
import {
  ACID, BRUSH_ELEMENTS, DIRT, ELEMENTS, EMPTY, GLASS, LAVA,
  METAL, OIL, REACTIONS, RUST, SAND, SNOW, STONE, WATER, WOOD,
  type WeightedOutcome,
} from '../src/elements';

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
      for (const id of [r.a, r.b]) {
        expect(ELEMENTS[id]).toBeDefined();
      }
      for (const outcome of [r.aBecomes, r.bBecomes]) {
        if (typeof outcome === 'number') {
          expect(ELEMENTS[outcome]).toBeDefined();
        } else {
          for (const o of outcome) {
            expect(ELEMENTS[o.into]).toBeDefined();
            expect(o.weight).toBeGreaterThan(0);
          }
        }
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

  it('new liquid/powder densities are ordered as designed', () => {
    // snow < oil < water < acid < dirt < sand < lava
    expect(ELEMENTS[SNOW].density).toBeLessThan(ELEMENTS[OIL].density);
    expect(ELEMENTS[OIL].density).toBeLessThan(ELEMENTS[WATER].density);
    expect(ELEMENTS[WATER].density).toBeLessThan(ELEMENTS[ACID].density);
    expect(ELEMENTS[ACID].density).toBeLessThan(ELEMENTS[DIRT].density);
    expect(ELEMENTS[DIRT].density).toBeLessThan(ELEMENTS[SAND].density);
    expect(ELEMENTS[SAND].density).toBeLessThan(ELEMENTS[LAVA].density);
  });

  it('glass and rust are discovery-only, not paintable', () => {
    expect(BRUSH_ELEMENTS).not.toContain(GLASS);
    expect(BRUSH_ELEMENTS).not.toContain(RUST);
  });

  it('acid only reacts with stone, wood, and metal — not water, sand, or living things', () => {
    const acidPartners = REACTIONS
      .filter(r => r.a === ACID || r.b === ACID)
      .map(r => (r.a === ACID ? r.b : r.a));
    expect(new Set(acidPartners)).toEqual(new Set([STONE, WOOD, METAL]));
  });
});
