import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getCurrentUser, isUserApproved } from '../auth/authService';
import { loadGame, saveGame } from './save';
import { createNewPlayerData, migrateSaveData } from './migrations';
import type { TinyTamerSave } from './saveTypes';

export type StorageMode = 'local' | 'supabase' | 'supabase-fallback';

let storageMode: StorageMode = isSupabaseConfigured() ? 'supabase' : 'local';
let saveStatus: 'Idle' | 'Saving' | 'Saved' | 'Error' = 'Idle';

export function getStorageMode(): StorageMode {
  return storageMode;
}

export function getSaveStatus(): string {
  return saveStatus;
}

export { createNewPlayerData, migrateSaveData };

export async function loadPlayerData(playerId?: string): Promise<TinyTamerSave> {
  if (!isSupabaseConfigured() || !supabase) {
    storageMode = 'local';
    return loadGame();
  }

  try {
    const user = await getCurrentUser();
    const effectivePlayerId = playerId ?? user?.id;
    if (!effectivePlayerId) {
      storageMode = 'local';
      return loadGame();
    }

    const approved = await isUserApproved(effectivePlayerId);
    if (!approved) {
      console.info('Supabase profile is not approved. Using local-only mode. Change this behavior in authService/storageService if desired.');
      storageMode = 'local';
      return loadGame();
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
    console.warn('Supabase load failed. Falling back to localStorage.', error);
    storageMode = 'supabase-fallback';
    return loadGame();
  }
}

export async function savePlayerData(data: TinyTamerSave): Promise<void> {
  saveStatus = 'Saving';
  if (!isSupabaseConfigured() || !supabase || storageMode !== 'supabase') {
    saveGame(data);
    saveStatus = 'Saved';
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
    console.warn('Supabase save failed. Saving to localStorage fallback.', error);
    storageMode = 'supabase-fallback';
    saveGame(data);
    saveStatus = 'Error';
  }
}
