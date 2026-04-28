// @ts-nocheck
const STRONG_AGAINST = {
  Leaf: ['Water', 'Stone'],
  Flame: ['Leaf', 'Bug', 'Frost'],
  Water: ['Flame', 'Stone'],
  Stone: ['Spark', 'Flame', 'Wind'],
  Spark: ['Water', 'Wind'],
  Moon: ['Spirit'],
  Spirit: ['Moon'],
  Wind: ['Bug', 'Leaf'],
  Bug: ['Moon', 'Leaf'],
  Frost: ['Wind', 'Leaf'],
};

const RESISTS = {
  Leaf: ['Water'],
  Flame: ['Flame', 'Frost'],
  Water: ['Flame', 'Water'],
  Stone: ['Spark', 'Wind'],
  Spark: ['Spark'],
  Moon: ['Moon', 'Spirit'],
  Spirit: ['Spirit'],
  Wind: ['Leaf'],
  Bug: ['Leaf'],
  Frost: ['Frost', 'Wind'],
};

export function getTypeEffectiveness(moveType, defenderType) {
  if (!moveType || !defenderType) return 1;
  if (STRONG_AGAINST[moveType]?.includes(defenderType)) return 1.5;
  if (RESISTS[defenderType]?.includes(moveType)) return 0.65;
  return 1;
}

export function getEffectivenessMessage(multiplier) {
  if (multiplier > 1) return 'It was super effective!';
  if (multiplier < 1) return 'It was not very effective.';
  return '';
}

