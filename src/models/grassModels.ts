// @ts-nocheck
import * as THREE from 'three';

export function createDetailedGrassPatch(x, z, width, depth, density = 42) {
  const group = new THREE.Group();
  group.position.set(x, 0.03, z);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.04, depth),
    new THREE.MeshStandardMaterial({ color: 0x58bd59, roughness: 0.9, flatShading: true }),
  );
  base.receiveShadow = true;
  group.add(base);

  const bladeGeo = new THREE.ConeGeometry(0.055, 0.42, 4);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x49a94b, roughness: 0.9, flatShading: true });
  const blades = [];

  for (let i = 0; i < density; i += 1) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat.clone());
    blade.material.color.offsetHSL((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.08);
    blade.position.set((Math.random() - 0.5) * width * 0.9, 0.19, (Math.random() - 0.5) * depth * 0.9);
    blade.scale.y = 0.75 + Math.random() * 0.55;
    blade.rotation.y = Math.random() * Math.PI;
    blade.userData.phase = Math.random() * Math.PI * 2;
    blade.castShadow = true;
    blades.push(blade);
    group.add(blade);
  }

  group.userData.blades = blades;
  return { group, zone: { x, z, width, depth } };
}

export function animateGrassPatch(group, elapsed) {
  group.userData.blades?.forEach((blade) => {
    blade.rotation.z = Math.sin(elapsed * 1.6 + blade.userData.phase) * 0.08;
  });
}

