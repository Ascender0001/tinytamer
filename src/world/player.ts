// @ts-nocheck
import * as THREE from 'three';
import { createPlayerModel, updatePlayerModelAnimation } from '../models/playerModel';

export class PlayerController {
  constructor(scene, world) {
    this.mesh = createPlayerModel();
    this.mesh.position.set(0, 0, 0);
    scene.add(this.mesh);
    this.world = world;
    this.speed = 5.1;
    this.acceleration = 18;
    this.deceleration = 20;
    this.velocity = new THREE.Vector3();
    this.radius = 0.38;
    this.targetRotationY = 0;
  }

  update(delta, input) {
    const direction = input.getDirection();
    const desiredVelocity = new THREE.Vector3(direction.x, 0, direction.z).multiplyScalar(this.speed);
    const smoothing = direction.x !== 0 || direction.z !== 0 ? this.acceleration : this.deceleration;
    this.velocity.lerp(desiredVelocity, 1 - Math.exp(-smoothing * delta));

    if (this.velocity.length() < 0.03) this.velocity.set(0, 0, 0);

    const nextX = this.mesh.position.x + this.velocity.x * delta;
    const nextZ = this.mesh.position.z + this.velocity.z * delta;

    const clampedX = THREE.MathUtils.clamp(nextX, -this.world.limit, this.world.limit);
    const clampedZ = THREE.MathUtils.clamp(nextZ, -this.world.limit, this.world.limit);

    if (this.canMoveTo(clampedX, clampedZ)) {
      this.mesh.position.x = clampedX;
      this.mesh.position.z = clampedZ;
    } else {
      this.velocity.multiplyScalar(0.25);
    }

    if (this.velocity.lengthSq() > 0.002) {
      this.targetRotationY = Math.atan2(this.velocity.x, this.velocity.z) + Math.PI;
      this.mesh.rotation.y = dampAngle(this.mesh.rotation.y, this.targetRotationY, 14, delta);
      const speedRatio = Math.min(1, this.velocity.length() / this.speed);
      this.mesh.position.y = Math.sin(performance.now() * 0.014) * 0.04 * speedRatio;
      this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, -this.velocity.x * 0.035, 0.14);
      updatePlayerModelAnimation(this.mesh, delta, speedRatio);
    } else {
      this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, 0, 0.12);
      this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, 0, 0.12);
      updatePlayerModelAnimation(this.mesh, delta, 0);
    }
  }

  collides(x, z) {
    return this.world.obstacles.some((obstacle) => {
      const distance = Math.hypot(x - obstacle.x, z - obstacle.z);
      return distance < obstacle.radius + this.radius;
    });
  }

  canMoveTo(x, z) {
    const insideWalkableLand = typeof this.world.isWalkable === 'function'
      ? this.world.isWalkable(x, z, this.radius)
      : true;

    return insideWalkableLand && !this.collides(x, z);
  }
}

function dampAngle(current, target, smoothing, delta) {
  const wrappedDelta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + wrappedDelta * (1 - Math.exp(-smoothing * delta));
}

