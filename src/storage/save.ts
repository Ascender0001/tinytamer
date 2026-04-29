import type { TinyTamerSave } from './saveTypes';
import { createNewPlayerData } from './migrations';

export function loadGame(): TinyTamerSave {
  return createNewPlayerData();
}

export async function loadPlayerData(): Promise<TinyTamerSave> {
  return createNewPlayerData();
}

export function saveGame(gameState: TinyTamerSave): void {
  void gameState;
}

export async function savePlayerData(data: TinyTamerSave): Promise<void> {
  void data;
}

