// @ts-nocheck
function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function rand(rng, min, max) {
  return min + rng() * (max - min);
}

function pickPointOnIsland(rng, island, margin = 1.4) {
  return {
    x: island.x + rand(rng, -island.width / 2 + margin, island.width / 2 - margin),
    z: island.z + rand(rng, -island.depth / 2 + margin, island.depth / 2 - margin),
  };
}

export function isNearBridge(position, bridges, margin = 2.1) {
  return bridges.some((bridge) => (
    position.x >= bridge.x - bridge.width / 2 - margin
    && position.x <= bridge.x + bridge.width / 2 + margin
    && position.z >= bridge.z - bridge.depth / 2 - margin
    && position.z <= bridge.z + bridge.depth / 2 + margin
  ));
}

function makeBridgeBetween(a, b) {
  const horizontal = Math.abs(a.x - b.x) >= Math.abs(a.z - b.z);
  if (horizontal) {
    const left = a.x < b.x ? a : b;
    const right = a.x < b.x ? b : a;
    const start = left.x + left.width / 2;
    const end = right.x - right.width / 2;
    return { x: (start + end) / 2, z: (left.z + right.z) / 2, width: Math.max(2.8, Math.abs(end - start) + 0.8), depth: 1.8 };
  }
  const top = a.z < b.z ? a : b;
  const bottom = a.z < b.z ? b : a;
  const start = top.z + top.depth / 2;
  const end = bottom.z - bottom.depth / 2;
  return { x: (top.x + bottom.x) / 2, z: (start + end) / 2, width: 1.8, depth: Math.max(2.8, Math.abs(end - start) + 0.8) };
}

export function generateWorld(seed = Date.now()) {
  const rng = createRng(seed);
  const gap = rand(rng, 5.5, 7.5);
  const islands = [
    { id: 'starter', x: 0, z: 0, width: rand(rng, 11, 13), depth: rand(rng, 9, 11), color: 0x86d46d },
    { id: 'forest', x: -16 - gap, z: rand(rng, -1.2, 1.2), width: rand(rng, 8, 10), depth: rand(rng, 8, 10), color: 0x78c96b },
    { id: 'rocky', x: 16 + gap, z: rand(rng, -1.2, 1.2), width: rand(rng, 8, 10), depth: rand(rng, 7, 9), color: 0x9eb978 },
    { id: 'rare', x: rand(rng, -3, 3), z: 17 + gap, width: rand(rng, 7, 9), depth: rand(rng, 6.5, 8.5), color: 0x9b83d8 },
    { id: 'challenge', x: 18 + gap, z: 17 + gap, width: rand(rng, 8, 10), depth: rand(rng, 8, 10), color: 0x8bb7a2 },
  ];

  const bridges = [
    makeBridgeBetween(islands[0], islands[1]),
    makeBridgeBetween(islands[0], islands[2]),
    makeBridgeBetween(islands[0], islands[3]),
    makeBridgeBetween(islands[3], islands[4]),
  ];

  const decorations = [];
  const grassZones = [];
  const flowers = [];
  const treeCounts = { starter: 5, forest: 12, rocky: 3, rare: 5, challenge: 7 };
  const rockCounts = { starter: 4, forest: 3, rocky: 10, rare: 4, challenge: 8 };

  islands.forEach((island, islandIndex) => {
    const grassCount = island.id === 'rocky' ? 2 : island.id === 'rare' ? 3 : 2;
    for (let i = 0; i < grassCount; i += 1) {
      let point = pickPointOnIsland(rng, island, 2.2);
      let guard = 0;
      while (isNearBridge(point, bridges, 2.8) && guard < 20) {
        point = pickPointOnIsland(rng, island, 2.2);
        guard += 1;
      }
      grassZones.push({ x: point.x, z: point.z, width: rand(rng, 2.8, 4.5), depth: rand(rng, 2.3, 3.7) });
    }

    for (let i = 0; i < treeCounts[island.id]; i += 1) {
      let point = pickPointOnIsland(rng, island, 1.8);
      let guard = 0;
      while ((isNearBridge(point, bridges, 3.2) || Math.hypot(point.x, point.z) < 3) && guard < 30) {
        point = pickPointOnIsland(rng, island, 1.8);
        guard += 1;
      }
      decorations.push({ kind: 'tree', ...point, variant: islandIndex * 7 + i });
    }

    for (let i = 0; i < rockCounts[island.id]; i += 1) {
      let point = pickPointOnIsland(rng, island, 1.5);
      let guard = 0;
      while ((isNearBridge(point, bridges, 2.7) || Math.hypot(point.x, point.z) < 2.8) && guard < 30) {
        point = pickPointOnIsland(rng, island, 1.5);
        guard += 1;
      }
      decorations.push({ kind: 'rock', ...point, scale: rand(rng, 0.65, island.id === 'rocky' ? 1.25 : 0.95) });
    }

    for (let i = 0; i < 12; i += 1) {
      const point = pickPointOnIsland(rng, island, 1.2);
      if (!isNearBridge(point, bridges, 1.6)) flowers.push(point);
    }
  });

  console.log(`[Tiny Tamer World] seed ${seed}`, { islands, bridges });
  return { seed, islands, bridges, decorations, grassZones, flowers, spawn: { x: 0, z: 0 } };
}

