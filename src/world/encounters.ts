// @ts-nocheck
import { createWildCreature } from '../battle/creatures';

function isInsideZone(position, zone) {
  return Math.abs(position.x - zone.x) <= zone.width / 2 && Math.abs(position.z - zone.z) <= zone.depth / 2;
}

export class EncounterManager {
  constructor({ grassZones, onEncounter }) {
    this.grassZones = grassZones;
    this.onEncounter = onEncounter;
    this.rollTimer = 0;
    this.cooldown = 2.5;
  }

  addCooldown(seconds = 3) {
    this.cooldown = Math.max(this.cooldown, seconds);
    this.rollTimer = 0.7;
  }

  getLevelRange(playerPosition) {
    if (playerPosition.x < -9) return { min: 6, max: 10 };
    if (playerPosition.x > 8 || Math.abs(playerPosition.x) > 7.5) return { min: 3, max: 6 };
    return { min: 1, max: 3 };
  }

  update(delta, playerPosition, isMoving) {
    if (this.cooldown > 0) this.cooldown -= delta;
    this.rollTimer -= delta;

    const inGrass = this.grassZones.some((zone) => isInsideZone(playerPosition, zone));
    if (!inGrass || !isMoving || this.cooldown > 0 || this.rollTimer > 0) return;

    this.rollTimer = 0.75;
    if (Math.random() < 0.06) {
      this.addCooldown(4.5);
      this.onEncounter(createWildCreature(this.getLevelRange(playerPosition)));
    }
  }
}

