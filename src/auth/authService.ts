import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export interface AuthProfile {
  id: string;
  display_name: string | null;
  approved: boolean;
  player_color?: string | null;
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn('Could not get Supabase user.', error);
    return null;
  }
  return data.user;
}

export async function signInWithEmail(email: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) console.warn('Supabase sign out failed.', error);
}

export async function getOrCreateProfile(): Promise<AuthProfile | null> {
  const user = await getCurrentUser();
  if (!user || !supabase) return null;
  const { data } = await supabase.from('profiles').select('id, display_name, approved, player_color').eq('id', user.id).maybeSingle();
  if (data) return data as AuthProfile;
  const displayName = user.email?.split('@')[0] ?? 'Tamer';
  const { data: inserted, error } = await supabase.from('profiles').insert({ id: user.id, display_name: displayName, approved: false }).select('id, display_name, approved, player_color').single();
  if (error) {
    console.warn('Could not create profile.', error);
    return null;
  }
  return inserted as AuthProfile;
}

export async function isCurrentUserApproved(): Promise<boolean> {
  const profile = await getOrCreateProfile();
  return Boolean(profile?.approved);
}

export async function isUserApproved(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { data, error } = await supabase.from('profiles').select('approved').eq('id', userId).maybeSingle();
  if (error) {
    console.warn('Could not check approval status. Falling back to local-only mode.', error);
    return false;
  }
  return Boolean(data?.approved);
}

export async function getPlayerId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
