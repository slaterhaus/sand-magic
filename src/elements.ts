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
export const SNOW = 14;
export const METAL = 15;
export const DIRT = 16;
export const ACID = 17;
export const GLASS = 18;
export const RUST = 19;

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
  growsInto?: {          // static elements only: grows a copy of itself upward
    into: ElementId;
    chance: number;       // per-frame chance to grow, if not yet at maxHeight
    maxHeight: number;    // caps how many segments tall it can grow
  };
  condenseNearTop?: {    // gases only: condenses back to a liquid near the top
    into: ElementId;
    rowFraction: number;  // fraction of grid height counted as "the top"
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
  [PLANT]:    { id: PLANT, name: 'Plant', colors: ['#3e9d3e', '#46ac46', '#358a35'], phase: 'static', density: 9999,
                growsInto: { into: PLANT, chance: 0.03, maxHeight: 6 } },
  [STEAM]:    { id: STEAM, name: 'Steam', colors: ['#c9d4dd', '#bcc8d2'], phase: 'gas', density: 1,
                condenseNearTop: { into: WATER, rowFraction: 0.15 } },  // steam cools back into rain near the top!
  [ICE]:      { id: ICE, name: 'Ice', colors: ['#aee1f5', '#9fd6ee'], phase: 'static', density: 9999 },
  [OIL]:      { id: OIL, name: 'Oil', colors: ['#4b3a5a', '#544166'], phase: 'liquid', density: 900 },
  [ASH]:      { id: ASH, name: 'Ash', colors: ['#9b9b93', '#8f8f88'], phase: 'powder', density: 700 },
  [OBSIDIAN]: { id: OBSIDIAN, name: 'Obsidian', colors: ['#2b2733', '#342f3f'], phase: 'static', density: 9999 },
  [SNOW]:     { id: SNOW, name: 'Snow', colors: ['#f5fbff', '#eaf4fb'], phase: 'powder', density: 800 },
  [METAL]:    { id: METAL, name: 'Metal', colors: ['#a8adb5', '#9aa0a8'], phase: 'static', density: 9999 },
  [DIRT]:     { id: DIRT, name: 'Dirt', colors: ['#5a4230', '#4e3828'], phase: 'powder', density: 1400 },
  [ACID]:     { id: ACID, name: 'Acid', colors: ['#7ee62c', '#6fd420'], phase: 'liquid', density: 1050 },
  [GLASS]:    { id: GLASS, name: 'Glass', colors: ['#bcd6d6', '#a9c9c9'], phase: 'static', density: 9999 },
  [RUST]:     { id: RUST, name: 'Rust', colors: ['#8a4a2a', '#7a3f22'], phase: 'static', density: 9999 },
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
  { a: FIRE, b: SAND, aBecomes: FIRE, bBecomes: GLASS, chance: 0.03,
    discovery: { name: 'Glass!', science: 'Sand is mostly a mineral called silica — enough heat melts it into glass, the same way glassblowers make bottles and windows.' } },
  { a: LAVA, b: SAND, aBecomes: LAVA, bBecomes: GLASS, chance: 0.03,
    discovery: { name: 'Glass!', science: 'Sand is mostly a mineral called silica — enough heat melts it into glass, the same way glassblowers make bottles and windows.' } },
  { a: METAL, b: WATER, aBecomes: RUST, bBecomes: WATER, chance: 0.01,
    discovery: { name: 'Rusty!', science: 'When metal sits in water a long time, it slowly reacts with the air and water to form rust — a new, weaker material. That is why old ships and playground equipment turn orange-brown.' } },
  { a: ACID, b: STONE, aBecomes: ACID, bBecomes: EMPTY, chance: 0.05,
    discovery: { name: 'Dissolved!', science: 'Acid is a liquid that can slowly break the bonds holding a solid together, eating through it bit by bit. Strong acids can dissolve rock over hundreds of years — it is how some caves form!' } },
  { a: ACID, b: WOOD, aBecomes: ACID, bBecomes: EMPTY, chance: 0.05,
    discovery: { name: 'Dissolved!', science: 'Acid is a liquid that can slowly break the bonds holding a solid together, eating through it bit by bit. Strong acids can dissolve rock over hundreds of years — it is how some caves form!' } },
  { a: ACID, b: METAL, aBecomes: ACID, bBecomes: EMPTY, chance: 0.05,
    discovery: { name: 'Dissolved!', science: 'Acid is a liquid that can slowly break the bonds holding a solid together, eating through it bit by bit. Strong acids can dissolve rock over hundreds of years — it is how some caves form!' } },
  { a: FIRE, b: SNOW, aBecomes: FIRE, bBecomes: WATER, chance: 0.3,
    discovery: { name: 'Melting', science: 'Heat makes the molecules in ice jiggle faster and faster until they break loose and flow — that is melting!' } },
  { a: LAVA, b: SNOW, aBecomes: LAVA, bBecomes: WATER, chance: 0.8,
    discovery: { name: 'Melting', science: 'Heat makes the molecules in ice jiggle faster and faster until they break loose and flow — that is melting!' } },
  { a: SEED, b: DIRT, aBecomes: PLANT, bBecomes: DIRT, chance: 1,
    discovery: { name: 'Sprout!', science: 'Seeds drink up water to sprout and grow. Plants build themselves mostly out of water and air!' } },
];

// Which elements show up in the paint palette (the eraser is added by the UI).
export const BRUSH_ELEMENTS: ElementId[] = [
  SAND, WATER, STONE, WOOD, SEED, ICE, OIL, LAVA, FIRE,
  SNOW, METAL, DIRT, ACID,
];
