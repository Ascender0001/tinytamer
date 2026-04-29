import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { createNewPlayerData } from '../storage/migrations';

export interface AuthProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  approved: boolean;
  player_color: string | null;
}

export interface AuthGateContext {
  user: User;
  profile: AuthProfile;
}

const PROFILE_COLUMNS = 'id, email, display_name, approved, player_color';

interface SupabaseErrorLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

function requireSupabase() {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is required to play Tiny Tamer.');
  return supabase;
}

function cleanDisplayName(displayName?: string): string | null {
  const trimmed = displayName?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 40);
}

function formatSupabaseError(error: SupabaseErrorLike): string {
  return [
    error.message,
    error.code ? `code: ${error.code}` : null,
    error.details ? `details: ${error.details}` : null,
    error.hint ? `hint: ${error.hint}` : null,
  ].filter(Boolean).join(' | ');
}

function logSupabaseError(label: string, error: SupabaseErrorLike): void {
  console.error(label, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
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
  console.info('[auth] signup started', { email: email.trim() });
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: { data: sanitizedDisplayName ? { display_name: sanitizedDisplayName } : undefined },
  });
  if (error) {
    logSupabaseError('[auth] signup failed', error);
    throw new Error(formatSupabaseError(error));
  }
  const user = data.user;
  console.info('[auth] auth user created', { userId: user?.id ?? null, hasSession: Boolean(data.session) });

  if (!user) {
    throw new Error('Check your email to confirm your account, then log in.');
  }

  if (!data.session) {
    console.info('[auth] signup requires email confirmation before profile creation', { userId: user.id });
    return { user, profile: null };
  }

  const profile = await getOrCreateProfile(user, sanitizedDisplayName ?? undefined);
  await ensureStarterPlayerSave(user.id);
  return { user, profile };
}

export async function signInWithEmailPassword(email: string, password: string): Promise<{ user: User; profile: AuthProfile | null }> {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  if (!data.user) throw new Error('Login failed. Check your email and password.');
  const profile = await getOrCreateProfile(data.user);
  await ensureStarterPlayerSave(data.user.id);
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
  if (!currentUser?.id) throw new Error('Cannot create profile without a valid authenticated user id.');
  const { data, error: selectError } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', currentUser.id).maybeSingle();
  if (selectError) {
    logSupabaseError('[auth] profile select failed', selectError);
    throw new Error(formatSupabaseError(selectError));
  }
  if (data) return data as AuthProfile;
  const fallbackDisplayName = cleanDisplayName(displayName) ?? currentUser.email?.split('@')[0] ?? 'Tamer';
  console.info('[auth] profile insert started', { userId: currentUser.id, email: currentUser.email ?? null });
  const { data: inserted, error } = await client
    .from('profiles')
    .upsert({ id: currentUser.id, email: currentUser.email ?? null, display_name: fallbackDisplayName, approved: false }, { onConflict: 'id' })
    .select(PROFILE_COLUMNS)
    .single();
  if (error) {
    logSupabaseError('[auth] profile insert failed', error);
    throw new Error(formatSupabaseError(error));
  }
  console.info('[auth] profile insert success', { userId: currentUser.id });
  return inserted as AuthProfile;
}

export async function ensureStarterPlayerSave(userId: string): Promise<void> {
  const client = requireSupabase();
  const starterSave = createNewPlayerData();
  starterSave.playerId = userId;
  console.info('[auth] player save insert started', { userId });
  const { error } = await client.from('player_saves').upsert({
    user_id: userId,
    save_version: starterSave.saveVersion,
    active_creature_id: starterSave.activeCreatureId,
    save_data: starterSave,
  }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) {
    logSupabaseError('[auth] player save insert failed', error);
    throw new Error(formatSupabaseError(error));
  }
  console.info('[auth] player save insert success', { userId });
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
