// @ts-nocheck
import * as THREE from 'three';
import { createLeafAnimator } from './animations';
import { createAmbientParticles } from './particles';
import { createAnimatedWater } from './water';
import { createTreeModel } from '../models/treeModels';
import { animateGrassPatch, createDetailedGrassPatch } from '../models/grassModels';
import { generateWorld } from './worldGenerator';

const WORLD_LIMIT = 24.5;

function material(color, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02, flatShading: true });
}

function createTree(x, z, leafAnimator, variant = 0) {
  const group = createTreeModel({ leafAnimator, variant });
  group.position.set(x, 0, z);
  return group;
}

function createRock(x, z, scale = 1) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48 * scale, 0), material(0x8d96a3));
  rock.position.set(x, 0.34 * scale, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

function createGrassPatch(x, z, width, depth) {
  return createDetailedGrassPatch(x, z, width, depth, Math.max(34, Math.floor(width * depth * 4)));
}

function createIsland(x, z, width, depth, color = 0x86d46d) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const sand = new THREE.Mesh(new THREE.BoxGeometry(width + 1, 0.24, depth + 1), material(0xf1d78f));
  sand.position.y = -0.45;
  sand.receiveShadow = true;
  group.add(sand);

  const ground = new THREE.Mesh(new THREE.BoxGeometry(width, 0.42, depth), material(color));
  ground.position.y = -0.22;
  ground.receiveShadow = true;
  group.add(ground);

  return { group, walkable: { x, z, width, depth } };
}

function createShoreline(x, z, width, depth) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(Math.min(width, depth) * 0.46, Math.max(width, depth) * 0.58, 36),
    new THREE.MeshBasicMaterial({ color: 0xdff8ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide }),
  );
  ring.position.set(x, -0.53, z);
  ring.rotation.x = -Math.PI / 2;
  ring.scale.x = width / Math.max(width, depth);
  ring.scale.y = depth / Math.max(width, depth);
  return ring;
}

function createBridge(x, z, width, depth) {
  const group = new THREE.Group();
  group.position.set(x, -0.06, z);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, depth), material(0xb9824a));
  deck.receiveShadow = true;
  deck.castShadow = true;
  group.add(deck);

  const railMat = material(0x7a4f2a);
  const horizontal = width >= depth;
  const railA = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, 0.12), railMat);
  const railB = railA.clone();
  railA.position.set(0, 0.18, horizontal ? -depth / 2 + 0.12 : 0);
  railB.position.set(0, 0.18, horizontal ? depth / 2 - 0.12 : 0);

  if (!horizontal) {
    railA.geometry = new THREE.BoxGeometry(0.12, 0.16, depth);
    railB.geometry = new THREE.BoxGeometry(0.12, 0.16, depth);
    railA.position.set(-width / 2 + 0.12, 0.18, 0);
    railB.position.set(width / 2 - 0.12, 0.18, 0);
  }

  railA.castShadow = true;
  railB.castShadow = true;
  group.add(railA, railB);

  const plankCount = horizontal ? Math.floor(width / 0.7) : Math.floor(depth / 0.7);
  for (let i = 0; i < plankCount; i += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? 0.08 : width, 0.04, horizontal ? depth : 0.08), material(0xd1975a));
    const offset = (i - plankCount / 2) * 0.7;
    plank.position.set(horizontal ? offset : 0, 0.08, horizontal ? 0 : offset);
    group.add(plank);
  }

  return { group, walkable: { x, z, width: width + 1.1, depth: depth + 1.1, isBridge: true } };
}

function createFlower(x, z, color) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 5), material(0x2f9a46));
  stem.position.y = 0.14;
  group.add(stem);
  const bloom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), material(color));
  bloom.position.y = 0.32;
  bloom.castShadow = true;
  group.add(bloom);
  return group;
}

export function createWorld(scene) {
  const generated = generateWorld(Math.floor(Math.random() * 999999999));
  const grassZones = [];
  const obstacles = [];
  const walkableZones = [];
  const animated = [];
  const grassPatchGroups = [];
  const leafAnimator = createLeafAnimator();
  const water = createAnimatedWater(scene);
  const particles = createAmbientParticles(scene);

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const landPieces = [
    ...generated.islands.map((island) => createIsland(island.x, island.z, island.width, island.depth, island.color)),
    ...generated.bridges.map((bridge) => createBridge(bridge.x, bridge.z, bridge.width, bridge.depth)),
  ];

  landPieces.forEach(({ group, walkable }) => {
    worldGroup.add(group);
    walkableZones.push(walkable);
    if (walkable.width > 3 && walkable.depth > 3) worldGroup.add(createShoreline(walkable.x, walkable.z, walkable.width + 1.1, walkable.depth + 1.1));
  });

  const patches = generated.grassZones.map((zone) => createGrassPatch(zone.x, zone.z, zone.width, zone.depth));
  patches.forEach(({ group, zone }) => {
    worldGroup.add(group);
    grassPatchGroups.push(group);
    grassZones.push(zone);
  });

  const decorations = generated.decorations.map((item) => (
    item.kind === 'tree'
      ? createTree(item.x, item.z, leafAnimator, item.variant)
      : createRock(item.x, item.z, item.scale)
  ));

  decorations.forEach((object) => {
    worldGroup.add(object);
    obstacles.push({ x: object.position.x, z: object.position.z, radius: object.type === 'Group' ? 0.8 : 0.55 });
  });

  const flowerColors = [0xff78a8, 0xfff26b, 0xb78cff, 0xff9f55, 0xffffff];
  generated.flowers.forEach(({ x, z }, i) => {
    worldGroup.add(createFlower(x, z, flowerColors[i % flowerColors.length]));
  });

  return {
    limit: WORLD_LIMIT,
    grassZones,
    obstacles,
    walkableZones,
    seed: generated.seed,
    isWalkable(x, z, radius = 0.35) {
      return walkableZones.some((zone) => (
        x >= zone.x - zone.width / 2 + (zone.isBridge ? 0 : radius)
        && x <= zone.x + zone.width / 2 - (zone.isBridge ? 0 : radius)
        && z >= zone.z - zone.depth / 2 + (zone.isBridge ? 0 : radius)
        && z <= zone.z + zone.depth / 2 - (zone.isBridge ? 0 : radius)
      ));
    },
    animate(delta) {
      const elapsed = performance.now() * 0.001;
      water.update(delta);
      particles.update(delta);
      leafAnimator.update(delta, elapsed);
      grassPatchGroups.forEach((group) => animateGrassPatch(group, elapsed));
      animated.forEach((item) => { item.mesh.rotation.z += item.speed * delta; });
    },
  };
}

