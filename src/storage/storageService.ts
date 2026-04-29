import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getCurrentUser, isUserApproved } from '../auth/authService';
import { loadGame, saveGame } from './save';
import { createNewPlayerData, migrateSaveData } from './migrations';
import type { TinyTamerSave } from './saveTypes';

export type StorageMode = 'local' | 'supabase' | 'supabase-fallback';
export type GameSaveMode = 'local' | 'online';

let storageMode: StorageMode = 'local';
let saveStatus: 'Idle' | 'Saving' | 'Saved' | 'Error' = 'Idle';

export function getStorageMode(): StorageMode {
  return storageMode;
}

export function getSaveStatus(): string {
  return saveStatus;
}

export { createNewPlayerData, migrateSaveData };

export async function loadPlayerData(mode: GameSaveMode, playerId?: string): Promise<TinyTamerSave> {
  if (mode === 'local') {
    storageMode = 'local';
    saveStatus = 'Idle';
    return loadGame();
  }

  if (!isSupabaseConfigured() || !supabase) {
    storageMode = 'supabase-fallback';
    throw new Error('Supabase is required for online saves.');
  }

  try {
    const user = await getCurrentUser();
    const effectivePlayerId = playerId ?? user?.id;
    if (!effectivePlayerId) {
      storageMode = 'supabase-fallback';
      throw new Error('Authentication is required for online saves.');
    }

    const approved = await isUserApproved(effectivePlayerId);
    if (!approved) {
      storageMode = 'supabase-fallback';
      throw new Error('Approval is required for online saves.');
    }

    const { data, error } = await supabase.from('player_saves').select('save_data').eq('user_id', effectivePlayerId).maybeSingle();
    if (error) throw error;
    storageMode = 'supabase';
    if (!data?.save_data) {
      const fresh = createNewPlayerData();
      fresh.playerId = effectivePlayerId;
      return fresh;
    }
    return migrateSaveData(data.save_data);
  } catch (error) {
    console.warn('Supabase load failed. Starting fresh online session without loading local saves.', error);
    storageMode = 'supabase-fallback';
    const fresh = createNewPlayerData();
    if (playerId) fresh.playerId = playerId;
    saveStatus = 'Error';
    return fresh;
  }
}

export async function savePlayerData(data: TinyTamerSave): Promise<void> {
  saveStatus = 'Saving';
  if (storageMode === 'local') {
    saveGame(data);
    saveStatus = 'Saved';
    return;
  }

  if (!isSupabaseConfigured() || !supabase || storageMode !== 'supabase') {
    saveStatus = 'Error';
    return;
  }

  try {
    const user = await getCurrentUser();
    const userId = user?.id ?? data.playerId;
    if (!userId) throw new Error('No Supabase user id available for save.');
    const payload = {
      user_id: userId,
      save_version: data.saveVersion,
      active_creature_id: data.activeCreatureId,
      save_data: {
        ...data,
        playerId: userId,
        settings: { muted: localStorage.getItem('tiny-tamer-muted') === 'true' },
      },
    };
    const { error } = await supabase.from('player_saves').upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;
    saveStatus = 'Saved';
  } catch (error) {
    console.warn('Supabase save failed. Online saves were not written.', error);
    storageMode = 'supabase-fallback';
    saveStatus = 'Error';
  }
}
