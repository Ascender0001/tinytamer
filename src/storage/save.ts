// @ts-nocheck
import { cloneCreature } from '../battle/creatures';
import type { TinyTamerSave } from './saveTypes';
import { createNewPlayerData, migrateSaveData } from './migrations';

const SAVE_KEY = 'tiny-tamer-save-v1';

export function loadGame(): TinyTamerSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createNewPlayerData();
    return migrateSaveData(JSON.parse(raw));
  } catch (error) {
    console.warn('Tiny Tamer save data could not be loaded.', error);
    return createNewPlayerData();
  }
}

export async function loadPlayerData(): Promise<TinyTamerSave> {
  // Supabase integration can later replace this local load behind the same API.
  return loadGame();
}

export function saveGame(gameState: TinyTamerSave): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    saveVersion: gameState.saveVersion,
    playerId: gameState.playerId,
    collection: gameState.collection.map(cloneCreature),
    activeCreatureId: gameState.activeCreatureId ?? gameState.collection[0]?.id ?? null,
  }));
}

export async function savePlayerData(data: TinyTamerSave): Promise<void> {
  // Supabase integration can later replace this local save behind the same API.
  saveGame(data);
}

