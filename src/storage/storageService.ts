import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getCurrentUser, isUserApproved } from '../auth/authService';
import { createNewPlayerData, migrateSaveData } from './migrations';
import type { TinyTamerSave } from './saveTypes';

export type StorageMode = 'supabase' | 'supabase-error';

let storageMode: StorageMode = 'supabase';
let saveStatus: 'Idle' | 'Saving' | 'Saved' | 'Save Error' = 'Idle';

export function getStorageMode(): StorageMode {
  return storageMode;
}

export function getSaveStatus(): string {
  return saveStatus;
}

export { createNewPlayerData, migrateSaveData };

export async function loadPlayerData(playerId: string): Promise<TinyTamerSave> {
  if (!isSupabaseConfigured() || !supabase) {
    storageMode = 'supabase-error';
    throw new Error('Supabase is required to play Tiny Tamer.');
  }

  try {
    const user = await getCurrentUser();
    const effectivePlayerId = playerId ?? user?.id;
    if (!effectivePlayerId) {
      storageMode = 'supabase-error';
      throw new Error('Authentication is required for online saves.');
    }

    const approved = await isUserApproved(effectivePlayerId);
    if (!approved) {
      storageMode = 'supabase-error';
      throw new Error('Approval is required for online saves.');
    }

    const { data, error } = await supabase.from('player_saves').select('save_data').eq('user_id', effectivePlayerId).maybeSingle();
    if (error) throw error;
    storageMode = 'supabase';
    if (!data?.save_data) {
      const fresh = createNewPlayerData();
      fresh.playerId = effectivePlayerId;
      await savePlayerData(fresh);
      return fresh;
    }
    return migrateSaveData(data.save_data);
  } catch (error) {
    console.warn('Supabase load failed. Starting fresh approved session without loading local saves.', error);
    storageMode = 'supabase-error';
    const fresh = createNewPlayerData();
    if (playerId) fresh.playerId = playerId;
    saveStatus = 'Save Error';
    return fresh;
  }
}

export async function savePlayerData(data: TinyTamerSave): Promise<void> {
  saveStatus = 'Saving';
  if (!isSupabaseConfigured() || !supabase) {
    storageMode = 'supabase-error';
    saveStatus = 'Save Error';
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
    storageMode = 'supabase';
    saveStatus = 'Saved';
  } catch (error) {
    console.warn('Supabase save failed. Online saves were not written.', error);
    storageMode = 'supabase-error';
    saveStatus = 'Save Error';
  }
}
