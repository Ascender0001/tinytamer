export type CreatureType = 'Leaf' | 'Flame' | 'Water' | 'Stone' | 'Spark' | 'Moon' | 'Wind' | 'Bug' | 'Frost' | 'Spirit';

export interface Move {
  id: string;
  name: string;
  type: CreatureType;
  power: number;
  accuracy: number;
  description: string;
}

export interface CreatureStats {
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface CreatureSpecies extends CreatureStats {
  templateId: string;
  name: string;
  type: CreatureType;
  baseStats: CreatureStats;
  catchRate: number;
  color: string;
  secondaryColor?: string;
  description: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  moveIds: string[];
  moves: Move[];
}

export interface OwnedCreature extends CreatureSpecies {
  id: string;
  currentHp: number;
}

export interface GameState {
  collection: OwnedCreature[];
  activeCreatureId: string | null;
}

export interface PlayerSaveData extends GameState {
  saveVersion: number;
  playerId: string;
}

export interface RectArea {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface WalkableArea extends RectArea {
  isBridge?: boolean;
}

export interface WorldIsland extends RectArea {
  id: string;
  color: number;
}

export interface WorldBridge extends WalkableArea {}

export interface EncounterZone extends RectArea {}

export type BattleState = 'IDLE' | 'INTRO' | 'PLAYER_CHOICE' | 'MOVE_CHOICE' | 'PLAYER_ACTION' | 'ENEMY_ACTION' | 'SWITCH_CHOICE' | 'ENDING';
