import * as THREE from 'three';

export function createRemotePlayerModel(color = '#72d6c9', name = 'Tamer'): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.36, 5, 10), mat);
  body.position.y = 0.46;
  body.castShadow = true;
  group.add(body);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 256;
  labelCanvas.height = 64;
  const ctx = labelCanvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(38,54,69,0.85)';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#fff7df';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, 128, 40);
  const texture = new THREE.CanvasTexture(labelCanvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.position.y = 1.25;
  sprite.scale.set(1.4, 0.35, 1);
  group.add(sprite);
  return group;
}
