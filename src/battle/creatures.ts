// @ts-nocheck
import { hydrateMoves } from './moves';
import { applyLevel, xpToNextLevel } from './leveling';

const CREATURE_TEMPLATES = [
  ['sproutle', 'Sproutle', 'Leaf', 36, 9, 7, 8, 0.68, '#66c76f', '#d7ff9a', 'A cheerful seedling critter that naps in warm moss.', ['vineLash', 'seedBurst']],
  ['emberkip', 'Emberkip', 'Flame', 32, 12, 6, 10, 0.54, '#ff7a45', '#ffd166', 'Its tiny tail spark glows brighter when it feels brave.', ['emberPop', 'heatRush']],
  ['muddillo', 'Muddillo', 'Stone', 44, 8, 12, 5, 0.5, '#a8754b', '#d9b38c', 'A round burrow buddy protected by a soft clay shell.', ['pebbleBash', 'rockGuard']],
  ['zapling', 'Zapling', 'Spark', 30, 13, 5, 14, 0.48, '#ffe15f', '#8be9ff', 'A jittery little sprig that crackles during rainstorms.', ['staticBite', 'zapFlicker']],
  ['bubblin', 'Bubblin', 'Water', 38, 10, 8, 9, 0.6, '#64d7ff', '#d8fbff', 'It drifts on puddles and sings through shimmering bubbles.', ['bubbleShot', 'tideSlap']],
  ['moondrop', 'Moondrop', 'Moon', 34, 11, 7, 11, 0.42, '#b692ff', '#fff2ac', 'A gentle night sprite that leaves silver dust in tall grass.', ['lunarTap', 'dreamDust']],
  ['gustwing', 'Gustwing', 'Wind', 31, 12, 5, 15, 0.52, '#b9eef7', '#ffffff', 'A breezy glider that races cloud shadows.', ['gustCut', 'featherDash']],
  ['skitterbud', 'Skitterbud', 'Bug', 33, 10, 8, 12, 0.62, '#9bd85d', '#4f8b3b', 'A button-eyed crawler that loves flower paths.', ['skitterJab', 'pollenPrank']],
  ['frostnub', 'Frostnub', 'Frost', 35, 11, 9, 7, 0.5, '#aee9ff', '#f4fdff', 'A chilly fluff that leaves tiny snowflakes behind.', ['snowJab', 'chillBreath']],
  ['wispurr', 'Wispurr', 'Spirit', 32, 12, 6, 13, 0.44, '#c8b7ff', '#7d6cff', 'A purring lantern glow that appears at dusk.', ['wispTouch', 'hexGlow']],
  ['leafawn', 'Leafawn', 'Leaf', 40, 10, 9, 10, 0.56, '#72d36f', '#f2ffd0', 'A shy forest friend with fern-like ears.', ['vineLash', 'seedBurst']],
  ['cinderbun', 'Cinderbun', 'Flame', 34, 13, 6, 13, 0.46, '#ff8b5c', '#4a2b2b', 'A warm-eared hopper that stomps out sparks.', ['emberPop', 'heatRush']],
  ['coralotl', 'Coralotl', 'Water', 42, 9, 11, 8, 0.52, '#57c7d9', '#ff9fb2', 'A tiny tidepool guardian with coral cheeks.', ['bubbleShot', 'tideSlap']],
  ['granibbit', 'Granibbit', 'Stone', 46, 10, 13, 6, 0.43, '#8d8f7a', '#d8d3b0', 'A stone-backed hopper that dozes on warm rocks.', ['pebbleBash', 'rockGuard']],
  ['voltick', 'Voltick', 'Spark', 29, 14, 5, 16, 0.4, '#f7e95f', '#222f5f', 'A tiny charged tick that hops between reeds.', ['staticBite', 'zapFlicker']],
  ['lunabbit', 'Lunabbit', 'Moon', 37, 11, 8, 12, 0.38, '#d9c2ff', '#fff7d1', 'A moonlit jumper with ears like crescent leaves.', ['lunarTap', 'dreamDust']],
  ['snowmote', 'Snowmote', 'Frost', 30, 12, 7, 14, 0.48, '#d9f7ff', '#8cc8ff', 'A floating frost speck that giggles in cold wind.', ['snowJab', 'chillBreath']],
  ['spookit', 'Spookit', 'Spirit', 36, 13, 7, 11, 0.36, '#8f7bff', '#2d245c', 'A playful shadow kitten that hides in moon grass.', ['wispTouch', 'hexGlow']],
];

export const CREATURES = CREATURE_TEMPLATES.map(([templateId, name, type, maxHp, attack, defense, speed, catchRate, color, secondaryColor, description, moveIds]) => ({
  templateId,
  name,
  type,
  baseStats: { maxHp, attack, defense, speed },
  maxHp,
  attack,
  defense,
  speed,
  catchRate,
  color,
  secondaryColor,
  description,
  level: 1,
  xp: 0,
  xpToNextLevel: xpToNextLevel(1),
  moveIds,
  moves: hydrateMoves(moveIds),
}));

export function findTemplate(creature) {
  return CREATURES.find((template) => template.templateId === creature?.templateId || template.name === creature?.name) ?? CREATURES[0];
}

export function cloneCreature(creature, options = {}) {
  const template = findTemplate(creature);
  const level = options.level ?? creature?.level ?? template.level ?? 1;
  const moveIds = creature?.moveIds ?? template.moveIds;
  const merged = {
    ...template,
    ...creature,
    id: creature?.id ?? `${template.templateId}-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    templateId: template.templateId,
    type: creature?.type === 'Ember' ? 'Flame' : creature?.type === 'Earth' ? 'Stone' : creature?.type === 'Bubble' ? 'Water' : creature?.type === 'Dream' ? 'Moon' : (creature?.type ?? template.type),
    level,
    xp: creature?.xp ?? 0,
    baseStats: template.baseStats,
    moveIds,
    moves: hydrateMoves(moveIds),
  };
  const scaled = applyLevel(merged, level);
  return { ...scaled, currentHp: creature?.currentHp ?? scaled.maxHp };
}

export function createStarterCreature() {
  return cloneCreature(CREATURES[0], { level: 1 });
}

export function createWildCreature(levelRange = { min: 1, max: 3 }) {
  const template = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  const min = levelRange.min ?? 1;
  const max = levelRange.max ?? min;
  const level = Math.floor(Math.random() * (max - min + 1)) + min;
  return cloneCreature(template, { level });
}

