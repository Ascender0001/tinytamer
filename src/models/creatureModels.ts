// @ts-nocheck
import * as THREE from 'three';

const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, flatShading: true });

function addEyes(group, y = 0.28, z = -0.42) {
  const eyeMat = mat(0x20242d);
  [-0.15, 0.15].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeMat);
    eye.position.set(x, y, z);
    group.add(eye);
  });
}

function part(geo, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  return mesh;
}

export function createCreatureModel(creature, { scale = 1 } = {}) {
  const group = new THREE.Group();
  const primary = mat(creature.color ?? '#88cc88');
  const secondary = mat(creature.secondaryColor ?? creature.color ?? '#ffffff');
  const dark = mat(0x2d3140);
  const type = creature.type;

  const body = part(new THREE.DodecahedronGeometry(0.48, 1), primary, [0, 0.35, 0], [1, 0.9, 1]);
  group.add(body);
  addEyes(group);

  if (type === 'Leaf') {
    group.add(part(new THREE.ConeGeometry(0.18, 0.48, 4), secondary, [-0.28, 0.8, 0], [1, 1, 0.6], [0.4, 0, -0.7]));
    group.add(part(new THREE.ConeGeometry(0.18, 0.48, 4), secondary, [0.28, 0.8, 0], [1, 1, 0.6], [0.4, 0, 0.7]));
    group.add(part(new THREE.ConeGeometry(0.12, 0.34, 5), secondary, [0, 0.9, 0.05], [1, 1, 0.7]));
  } else if (type === 'Flame') {
    group.add(part(new THREE.ConeGeometry(0.2, 0.55, 6), secondary, [0, 0.88, 0], [0.8, 1, 0.8]));
    group.add(part(new THREE.ConeGeometry(0.13, 0.36, 6), primary, [0.16, 0.82, 0.02], [0.7, 1, 0.7], [0.25, 0, -0.35]));
  } else if (type === 'Water') {
    group.add(part(new THREE.ConeGeometry(0.14, 0.36, 5), secondary, [-0.48, 0.35, 0], [1, 1, 0.4], [0, 0, 1.55]));
    group.add(part(new THREE.ConeGeometry(0.14, 0.36, 5), secondary, [0.48, 0.35, 0], [1, 1, 0.4], [0, 0, -1.55]));
    group.add(part(new THREE.SphereGeometry(0.08, 8, 6), secondary, [0.32, 0.72, -0.2]));
  } else if (type === 'Stone') {
    [[-0.32, 0.62, 0], [0.28, 0.68, 0.05], [0, 0.88, 0]].forEach((p) => group.add(part(new THREE.DodecahedronGeometry(0.16, 0), secondary, p)));
  } else if (type === 'Spark') {
    group.add(part(new THREE.ConeGeometry(0.13, 0.42, 3), secondary, [-0.28, 0.78, 0], [1, 1, 0.7], [0.2, 0, -0.45]));
    group.add(part(new THREE.ConeGeometry(0.13, 0.42, 3), secondary, [0.28, 0.78, 0], [1, 1, 0.7], [0.2, 0, 0.45]));
    group.add(part(new THREE.BoxGeometry(0.1, 0.1, 0.5), secondary, [0, 0.34, 0.48], [1, 1, 1], [0, 0.6, 0]));
  } else if (type === 'Moon') {
    group.add(part(new THREE.TorusGeometry(0.23, 0.045, 8, 16, Math.PI * 1.35), secondary, [0, 0.86, -0.02], [1, 1, 1], [0, 0.2, 0.7]));
  } else if (type === 'Bug') {
    [-0.38, -0.18, 0.18, 0.38].forEach((x) => group.add(part(new THREE.CapsuleGeometry(0.035, 0.25, 3, 5), dark, [x, 0.14, 0], [1, 1, 1], [0, 0, x > 0 ? -0.8 : 0.8])));
    group.add(part(new THREE.SphereGeometry(0.18, 8, 6), secondary, [0, 0.62, 0.18], [1, 0.25, 0.7]));
  } else if (type === 'Frost') {
    [-0.24, 0, 0.24].forEach((x) => group.add(part(new THREE.ConeGeometry(0.08, 0.34, 4), secondary, [x, 0.82, 0], [1, 1, 1])));
  } else if (type === 'Spirit') {
    body.material.transparent = true;
    body.material.opacity = 0.82;
    group.add(part(new THREE.ConeGeometry(0.18, 0.55, 7), secondary, [0, 0.05, 0.25], [1, 1, 0.5], [1.5, 0, 0]));
  } else if (type === 'Wind') {
    group.add(part(new THREE.ConeGeometry(0.18, 0.55, 5), secondary, [-0.46, 0.48, 0.03], [1, 1, 0.35], [0, 0, 1.35]));
    group.add(part(new THREE.ConeGeometry(0.18, 0.55, 5), secondary, [0.46, 0.48, 0.03], [1, 1, 0.35], [0, 0, -1.35]));
  }

  group.scale.setScalar(scale);
  group.userData.baseY = 0;
  return group;
}

export function updateCreatureModel(group, elapsed) {
  group.position.y = group.userData.baseY + Math.sin(elapsed * 2.2 + (group.userData.phase ?? 0)) * 0.06;
  group.rotation.y = Math.sin(elapsed * 1.3 + (group.userData.phase ?? 0)) * 0.08;
}

