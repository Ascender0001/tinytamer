// @ts-nocheck
import * as THREE from 'three';

const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });

export function createTreeModel({ leafAnimator, variant = 0 } = {}) {
  const group = new THREE.Group();
  const trunkMat = mat(variant % 2 ? 0x7b4e2f : 0x8a5a2b);
  const leafColors = [0x3e9b48, 0x55ad5f, 0x2f8744, 0x68b85b];
  const leafMat = mat(leafColors[variant % leafColors.length]);

  for (let i = 0; i < 3; i += 1) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - i * 0.025, 0.26 - i * 0.02, 0.42, 6), trunkMat);
    trunk.position.y = 0.2 + i * 0.38;
    trunk.rotation.z = Math.sin(variant + i) * 0.04;
    trunk.castShadow = true;
    group.add(trunk);
  }

  [-0.32, 0.28].forEach((x, i) => {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.55, 5), trunkMat);
    branch.position.set(x * 0.5, 0.82 + i * 0.2, 0);
    branch.rotation.z = x > 0 ? -0.95 : 0.95;
    branch.castShadow = true;
    group.add(branch);
  });

  const clusterPositions = [[0, 1.55, 0], [-0.38, 1.25, 0.08], [0.35, 1.3, -0.05], [0.05, 1.85, 0.05]];
  clusterPositions.forEach((position, i) => {
    const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58 - i * 0.045, 0), leafMat);
    leaves.position.set(...position);
    leaves.castShadow = true;
    group.add(leaves);
    leafAnimator?.add(leaves, 0.7 + i * 0.12);
  });

  return group;
}

