import { describe, expect, it } from 'vitest';
import { LAVA, WATER } from '../src/elements';
import { Grid } from '../src/engine/grid';
import { stepReactions, type Discovery } from '../src/engine/reactions';
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

  it('persists a discovery through the real stepReactions wiring (main.ts pattern)', () => {
    const storage = fakeStorage();
    const journal = new Journal(storage);
    const g = new Grid(4, 2);
    g.set(0, 0, LAVA);
    g.set(1, 0, WATER);

    stepReactions(g, journal.seen, d => { journal.record(d); }, () => 0);

    expect(journal.entries.length).toBe(1);
    expect(journal.entries[0].name).toBe('Obsidian!');
    expect(JSON.parse(storage.data['sand-magic-journal'])).toEqual(journal.entries);
  });
});
