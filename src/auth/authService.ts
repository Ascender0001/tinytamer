import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  approved: boolean;
  player_color: string | null;
}

export interface AuthGateContext {
  mode: 'local' | 'online';
  user: User | null;
  profile: AuthProfile | null;
}

const PROFILE_COLUMNS = 'id, email, display_name, approved, player_color';

function requireSupabase() {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured. You can still play locally.');
  return supabase;
}

function cleanDisplayName(displayName?: string): string | null {
  const trimmed = displayName?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 40);
}

export function canPlayOnline(user: User | null | undefined, profile: AuthProfile | null | undefined): user is User {
  return Boolean(user && profile?.approved === true && profile.id === user.id);
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn('Could not get Supabase session.', error);
    return null;
  }
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured() || !supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.warn('Could not get Supabase user.', error);
    return null;
  }
  return data.user;
}

export async function signUpWithEmailPassword(email: string, password: string, displayName?: string): Promise<{ user: User | null; profile: AuthProfile | null }> {
  const client = requireSupabase();
  const sanitizedDisplayName = cleanDisplayName(displayName);
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: { data: sanitizedDisplayName ? { display_name: sanitizedDisplayName } : undefined },
  });
  if (error) throw error;
  const user = data.user;

  if (!user || !data.session) {
    return { user, profile: null };
  }

  const profile = await getOrCreateProfile(user, sanitizedDisplayName ?? undefined);
  return { user, profile };
}

export async function signInWithEmailPassword(email: string, password: string): Promise<{ user: User; profile: AuthProfile | null }> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  if (!data.user) throw new Error('Login failed. Check your email and password.');
  const profile = await getOrCreateProfile(data.user);
  return { user: data.user, profile };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) console.warn('Supabase sign out failed.', error);
}

export async function getOrCreateProfile(user?: User | null, displayName?: string): Promise<AuthProfile | null> {
  const client = requireSupabase();
  const currentUser = user ?? await getCurrentUser();
  if (!currentUser) return null;
  const { data, error: selectError } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', currentUser.id).maybeSingle();
  if (selectError) {
    console.warn('Could not load profile.', selectError);
    return null;
  }
  if (data) return data as AuthProfile;
  const fallbackDisplayName = cleanDisplayName(displayName) ?? currentUser.email?.split('@')[0] ?? 'Tamer';
  const { data: inserted, error } = await client
    .from('profiles')
    .insert({ id: currentUser.id, email: currentUser.email ?? null, display_name: fallbackDisplayName, approved: false })
    .select(PROFILE_COLUMNS)
    .single();
  if (error) {
    console.warn('Could not create profile.', error);
    return null;
  }
  return inserted as AuthProfile;
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const user = await getCurrentUser();
  return getOrCreateProfile(user);
}

export async function isUserApproved(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;
  const { data, error } = await supabase.from('profiles').select('approved').eq('id', userId).maybeSingle();
  if (error) {
    console.warn('Could not check approval status.', error);
    return false;
  }
  return Boolean(data?.approved);
}
