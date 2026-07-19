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
