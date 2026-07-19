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
