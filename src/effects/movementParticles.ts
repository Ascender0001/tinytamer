// @ts-nocheck
import * as THREE from 'three';

export class MovementParticles {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.spawnAccumulator = 0;
    this.geometry = new THREE.SphereGeometry(0.055, 6, 4);
    this.dustMat = new THREE.MeshStandardMaterial({ color: 0xd7b98a, roughness: 1, transparent: true, opacity: 0.65 });
    this.leafMat = new THREE.MeshStandardMaterial({ color: 0x8ed16d, roughness: 1, transparent: true, opacity: 0.75 });
  }

  spawn(position, velocity, leafy = false) {
    const mesh = new THREE.Mesh(this.geometry, leafy ? this.leafMat.clone() : this.dustMat.clone());
    const back = velocity.clone().normalize().multiplyScalar(-0.38);
    mesh.position.set(position.x + back.x + THREE.MathUtils.randFloatSpread(0.18), 0.04, position.z + back.z + THREE.MathUtils.randFloatSpread(0.18));
    mesh.scale.setScalar(0.65 + Math.random() * 0.7);
    mesh.userData.life = 0.55;
    mesh.userData.maxLife = 0.55;
    mesh.userData.velocity = new THREE.Vector3(THREE.MathUtils.randFloatSpread(0.25), 0.25 + Math.random() * 0.2, THREE.MathUtils.randFloatSpread(0.25));
    this.pool.push(mesh);
    this.scene.add(mesh);
  }

  update(delta, player, isPaused, inGrass = false) {
    const speed = player.velocity?.length() ?? 0;
    if (!isPaused && speed > 0.7) {
      this.spawnAccumulator += delta * speed * 4.5;
      while (this.spawnAccumulator > 1) {
        this.spawn(player.mesh.position, player.velocity, inGrass);
        this.spawnAccumulator -= 1;
      }
    }

    for (let i = this.pool.length - 1; i >= 0; i -= 1) {
      const particle = this.pool[i];
      particle.userData.life -= delta;
      particle.position.addScaledVector(particle.userData.velocity, delta);
      particle.userData.velocity.y -= delta * 0.6;
      particle.material.opacity = Math.max(0, particle.userData.life / particle.userData.maxLife) * 0.72;
      particle.scale.multiplyScalar(1 + delta * 0.8);
      if (particle.userData.life <= 0) {
        this.scene.remove(particle);
        particle.material.dispose();
        this.pool.splice(i, 1);
      }
    }
  }
}

