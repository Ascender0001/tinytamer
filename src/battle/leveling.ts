// @ts-nocheck
export function xpToNextLevel(level = 1) {
  return 20 + level * 15;
}

export function scaleStats(baseStats, level = 1) {
  const levelBonus = Math.max(0, level - 1);
  return {
    maxHp: baseStats.maxHp + levelBonus * 5,
    attack: baseStats.attack + levelBonus * 2,
    defense: baseStats.defense + Math.floor(levelBonus * 1.5),
    speed: baseStats.speed + Math.floor(levelBonus * 1.5),
  };
}

export function applyLevel(creature, level = creature.level ?? 1) {
  const stats = scaleStats(creature.baseStats ?? creature, level);
  return {
    ...creature,
    level,
    xp: creature.xp ?? 0,
    xpToNextLevel: xpToNextLevel(level),
    ...stats,
    currentHp: Math.min(creature.currentHp ?? stats.maxHp, stats.maxHp),
  };
}

export function gainXp(creature, amount) {
  const messages = [];
  let updated = { ...creature, xp: (creature.xp ?? 0) + amount };

  while (updated.xp >= xpToNextLevel(updated.level)) {
    updated.xp -= xpToNextLevel(updated.level);
    updated.level += 1;
    const oldMaxHp = updated.maxHp;
    updated = applyLevel(updated, updated.level);
    updated.currentHp = updated.maxHp;
    messages.push(`${updated.name} grew to level ${updated.level}!`);
    if (updated.maxHp > oldMaxHp) messages.push(`${updated.name} feels stronger and fully refreshed!`);
  }

  updated.xpToNextLevel = xpToNextLevel(updated.level);
  return { creature: updated, messages };
}

export function calculateXpGain(enemyLevel = 1) {
  return Math.max(10, enemyLevel * 10);
}

