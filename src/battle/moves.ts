// @ts-nocheck
export const MOVES = {
  vineLash: { id: 'vineLash', name: 'Vine Lash', type: 'Leaf', power: 12, accuracy: 0.95, description: 'A quick snapping vine strike.' },
  seedBurst: { id: 'seedBurst', name: 'Seed Burst', type: 'Leaf', power: 17, accuracy: 0.88, description: 'Seeds pop with leafy force.' },
  emberPop: { id: 'emberPop', name: 'Ember Pop', type: 'Flame', power: 13, accuracy: 0.94, description: 'A tiny burst of warm sparks.' },
  heatRush: { id: 'heatRush', name: 'Heat Rush', type: 'Flame', power: 18, accuracy: 0.86, description: 'A fast dash wrapped in heat.' },
  bubbleShot: { id: 'bubbleShot', name: 'Bubble Shot', type: 'Water', power: 12, accuracy: 0.96, description: 'A focused bubble stream.' },
  tideSlap: { id: 'tideSlap', name: 'Tide Slap', type: 'Water', power: 18, accuracy: 0.87, description: 'A splashy sweeping hit.' },
  pebbleBash: { id: 'pebbleBash', name: 'Pebble Bash', type: 'Stone', power: 14, accuracy: 0.93, description: 'A sturdy pebble-powered bump.' },
  rockGuard: { id: 'rockGuard', name: 'Rock Guard', type: 'Stone', power: 10, accuracy: 1, description: 'A careful guarded shove.' },
  staticBite: { id: 'staticBite', name: 'Static Bite', type: 'Spark', power: 14, accuracy: 0.92, description: 'A zippy charged nip.' },
  zapFlicker: { id: 'zapFlicker', name: 'Zap Flicker', type: 'Spark', power: 19, accuracy: 0.84, description: 'A flickering bolt of mischief.' },
  lunarTap: { id: 'lunarTap', name: 'Lunar Tap', type: 'Moon', power: 13, accuracy: 0.95, description: 'A soft tap with moonlit force.' },
  dreamDust: { id: 'dreamDust', name: 'Dream Dust', type: 'Moon', power: 17, accuracy: 0.88, description: 'A glittering dreamy puff.' },
  gustCut: { id: 'gustCut', name: 'Gust Cut', type: 'Wind', power: 13, accuracy: 0.95, description: 'A crisp slicing breeze.' },
  featherDash: { id: 'featherDash', name: 'Feather Dash', type: 'Wind', power: 18, accuracy: 0.87, description: 'A feathery high-speed charge.' },
  skitterJab: { id: 'skitterJab', name: 'Skitter Jab', type: 'Bug', power: 12, accuracy: 0.96, description: 'A tiny but determined jab.' },
  pollenPrank: { id: 'pollenPrank', name: 'Pollen Prank', type: 'Bug', power: 17, accuracy: 0.88, description: 'A tricky cloud of bright pollen.' },
  snowJab: { id: 'snowJab', name: 'Snow Jab', type: 'Frost', power: 13, accuracy: 0.94, description: 'A chilly poke of packed snow.' },
  chillBreath: { id: 'chillBreath', name: 'Chill Breath', type: 'Frost', power: 18, accuracy: 0.86, description: 'A frosty breath that bites.' },
  wispTouch: { id: 'wispTouch', name: 'Wisp Touch', type: 'Spirit', power: 13, accuracy: 0.95, description: 'A gentle glow with spooky force.' },
  hexGlow: { id: 'hexGlow', name: 'Hex Glow', type: 'Spirit', power: 18, accuracy: 0.86, description: 'A strange shimmer from beyond.' },
};

export function getMove(moveId) {
  return MOVES[moveId] ?? MOVES.vineLash;
}

export function hydrateMoves(moveIds = []) {
  return moveIds.map(getMove).filter(Boolean);
}

