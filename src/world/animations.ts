// @ts-nocheck
export function createLeafAnimator() {
  const leaves = [];

  return {
    add(mesh, intensity = 1) {
      leaves.push({
        mesh,
        phase: Math.random() * Math.PI * 2,
        speed: 0.65 + Math.random() * 0.55,
        intensity,
      });
    },
    update(delta, elapsed) {
      leaves.forEach((leaf) => {
        const sway = Math.sin(elapsed * leaf.speed + leaf.phase) * 0.045 * leaf.intensity;
        const scale = 1 + Math.sin(elapsed * leaf.speed * 1.4 + leaf.phase) * 0.025 * leaf.intensity;
        leaf.mesh.rotation.z = sway;
        leaf.mesh.rotation.x = sway * 0.45;
        leaf.mesh.scale.setScalar(scale);
      });
    },
  };
}

