// @ts-nocheck
import * as THREE from 'three';

const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true });

export function createPlayerModel() {
  const group = new THREE.Group();
  const refs = { body: null, scarf: null, pack: null };

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.36, 5, 10), mat(0xffd166));
  body.position.y = 0.46;
  body.scale.set(1.08, 1, 0.92);
  body.castShadow = true;
  refs.body = body;
  group.add(body);

  const cheekMat = mat(0xff9aa6);
  [-0.16, 0.16].forEach((x) => {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.035, 7, 5), cheekMat);
    cheek.position.set(x, 0.53, -0.265);
    group.add(cheek);
  });

  const eyeMat = mat(0x2f2f38);
  [-0.09, 0.09].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), eyeMat);
    eye.position.set(x, 0.6, -0.265);
    group.add(eye);
  });

  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.13), mat(0xef476f));
  scarf.position.set(0, 0.43, -0.28);
  scarf.castShadow = true;
  refs.scarf = scarf;
  group.add(scarf);

  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.12), mat(0x8d6a4a));
  pack.position.set(0, 0.42, 0.25);
  pack.castShadow = true;
  refs.pack = pack;
  group.add(pack);

  const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 5), mat(0x66c76f));
  sprout.position.set(0, 0.88, 0);
  sprout.rotation.z = 0.2;
  sprout.castShadow = true;
  group.add(sprout);

  group.userData.refs = refs;
  return group;
}

export function updatePlayerModelAnimation(group, delta, speedRatio) {
  const refs = group.userData.refs;
  if (!refs) return;
  const time = performance.now() * 0.012;
  refs.body.scale.x = 1.08 + Math.sin(time * 1.5) * 0.025 * speedRatio;
  refs.body.scale.y = 1 - Math.sin(time * 1.5) * 0.03 * speedRatio;
  refs.body.rotation.x = Math.abs(Math.sin(time)) * 0.04 * speedRatio;
  refs.scarf.rotation.y = Math.sin(time * 1.8) * 0.08 * speedRatio;
  refs.pack.rotation.x = Math.sin(time) * 0.03 * speedRatio;
}

