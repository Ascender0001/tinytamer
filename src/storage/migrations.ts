// @ts-nocheck
import { createStarterCreature, cloneCreature } from '../battle/creatures';
import type { TinyTamerSave } from './saveTypes';
import { CURRENT_SAVE_VERSION } from './saveTypes';

export function createNewPlayerData(): TinyTamerSave {
  const starter = createStarterCreature();
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    playerId: 'local-player',
    collection: [starter],
    activeCreatureId: starter.id,
  };
}

export function migrateSaveData(raw: unknown): TinyTamerSave {
  if (!raw || typeof raw !== 'object') return createNewPlayerData();
  const data = raw as Partial<TinyTamerSave>;
  const collection = Array.isArray(data.collection) ? data.collection.map((creature) => cloneCreature(creature)) : [];
  const safeCollection = collection.length > 0 ? collection : [createStarterCreature()];
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    playerId: data.playerId ?? 'local-player',
    collection: safeCollection,
    activeCreatureId: data.activeCreatureId ?? safeCollection[0]?.id ?? null,
  };
}

