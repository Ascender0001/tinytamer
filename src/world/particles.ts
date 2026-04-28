// @ts-nocheck
import * as THREE from 'three';

const PARTICLE_COUNT = 160;

function createParticleSystem({ color, size, count, area, yRange }) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = area.x + THREE.MathUtils.randFloatSpread(area.width);
    positions[i * 3 + 1] = THREE.MathUtils.randFloat(yRange.min, yRange.max);
    positions[i * 3 + 2] = area.z + THREE.MathUtils.randFloatSpread(area.depth);
    phases[i] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

export function createAmbientParticles(scene) {
  const pollen = createParticleSystem({
    color: 0xfff2a8,
    size: 0.075,
    count: PARTICLE_COUNT,
    area: { x: 0, z: 0, width: 36, depth: 28 },
    yRange: { min: 0.8, max: 3.8 },
  });

  const sparkles = createParticleSystem({
    color: 0xdcc7ff,
    size: 0.095,
    count: 48,
    area: { x: -18.5, z: 10.5, width: 8, depth: 7 },
    yRange: { min: 0.7, max: 2.9 },
  });

  const mist = createParticleSystem({
    color: 0xdff8ff,
    size: 0.11,
    count: 70,
    area: { x: 0, z: 0, width: 42, depth: 32 },
    yRange: { min: 0.05, max: 0.55 },
  });

  scene.add(pollen, sparkles, mist);

  function updatePoints(points, delta, drift, bounds) {
    const positions = points.geometry.attributes.position.array;
    const phases = points.geometry.attributes.phase.array;
    for (let i = 0; i < phases.length; i += 1) {
      phases[i] += delta;
      positions[i * 3] += Math.sin(phases[i] * 0.7) * drift.x * delta;
      positions[i * 3 + 1] += Math.sin(phases[i] * 1.4) * drift.y * delta;
      positions[i * 3 + 2] += drift.z * delta;

      if (positions[i * 3 + 2] > bounds.zMax) positions[i * 3 + 2] = bounds.zMin;
      if (positions[i * 3] > bounds.xMax) positions[i * 3] = bounds.xMin;
      if (positions[i * 3] < bounds.xMin) positions[i * 3] = bounds.xMax;
    }
    points.geometry.attributes.position.needsUpdate = true;
  }

  return {
    update(delta) {
      updatePoints(pollen, delta, { x: 0.08, y: 0.13, z: 0.18 }, { xMin: -19, xMax: 19, zMin: -15, zMax: 15 });
      updatePoints(sparkles, delta, { x: 0.04, y: 0.18, z: 0.08 }, { xMin: -22, xMax: -14, zMin: 7, zMax: 14 });
      updatePoints(mist, delta, { x: 0.04, y: 0.05, z: 0.12 }, { xMin: -23, xMax: 23, zMin: -17, zMax: 17 });
    },
  };
}

