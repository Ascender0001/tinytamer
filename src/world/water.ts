// @ts-nocheck
import * as THREE from 'three';

export function createAnimatedWater(scene) {
  const uniforms = {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(0x64c9ec) },
    uColorB: { value: new THREE.Color(0x2f9fd6) },
  };

  const geometry = new THREE.PlaneGeometry(76, 76, 80, 80);
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: false,
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float waveA = sin((pos.x * 0.42) + uTime * 0.85) * 0.07;
        float waveB = cos((pos.y * 0.35) - uTime * 0.62) * 0.05;
        pos.z += waveA + waveB;
        vWave = waveA + waveB;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uTime;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        float shimmer = sin((vUv.x + vUv.y) * 44.0 + uTime * 1.7) * 0.035;
        float mixValue = 0.45 + vWave * 1.8 + shimmer;
        vec3 color = mix(uColorB, uColorA, clamp(mixValue, 0.0, 1.0));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.6;
  mesh.receiveShadow = true;
  scene.add(mesh);

  return {
    mesh,
    update(delta) {
      uniforms.uTime.value += delta;
    },
  };
}

