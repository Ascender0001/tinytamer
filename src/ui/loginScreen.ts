import { isSupabaseConfigured } from '../lib/supabaseClient';
import { canPlayOnline, getCurrentSession, getCurrentUser, getOrCreateProfile, signInWithEmailPassword, signOut, signUpWithEmailPassword, type AuthGateContext, type AuthProfile } from '../auth/authService';
import type { User } from '@supabase/supabase-js';

type AuthMode = 'login' | 'register';
type AuthTone = 'info' | 'error' | 'success';

interface AuthScreenState {
  mode: AuthMode;
  loading: boolean;
  message: string;
  tone: AuthTone;
  user: User | null;
  profile: AuthProfile | null;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function getInputValue(root: HTMLElement, selector: string): string {
  return (root.querySelector<HTMLInputElement>(selector)?.value ?? '').trim();
}

function validateEmailPassword(email: string, password: string): string | null {
  if (!email) return 'Email is required.';
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

function renderWaiting(user: User, message: string): string {
  return `
    <div class="login-card auth-shell waiting-card">
      <div class="auth-brand"><span class="auth-badge">Approval Pending</span><h1>Tiny Tamer</h1><p>Your account is waiting for approval.</p></div>
      <div class="login-status"><span>Signed in as ${escapeHtml(user.email ?? 'unknown user')}</span><span>Access: Waiting for approval</span></div>
      <p class="auth-message info">${escapeHtml(message)}</p>
      <div class="login-actions single-action"><button id="logout-button">Logout</button></div>
      <p class="login-note">A project owner must approve your profile before gameplay is available.</p>
    </div>
  `;
}

function renderAuthForm(state: AuthScreenState): string {
  const isLogin = state.mode === 'login';
  const disabled = state.loading ? 'disabled' : '';
  return `
    <div class="login-card auth-shell">
      <div class="auth-brand"><span class="auth-badge">Online Save</span><h1>Tiny Tamer</h1><p>Login or register with email and password to enter the world.</p></div>
      <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button id="auth-tab-login" class="auth-tab ${isLogin ? 'active' : ''}" ${disabled} type="button">Login</button>
        <button id="auth-tab-register" class="auth-tab ${!isLogin ? 'active' : ''}" ${disabled} type="button">Register</button>
      </div>
      <form id="auth-form" class="auth-form" novalidate>
        ${isLogin ? '' : `<label><span>Display name <small>optional</small></span><input id="auth-display-name" type="text" maxlength="40" autocomplete="nickname" placeholder="Pixel Tamer" ${disabled} /></label>`}
        <label><span>Email</span><input id="auth-email" type="email" autocomplete="email" placeholder="friend@example.com" ${disabled} /></label>
        <label><span>Password</span><input id="auth-password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="At least 6 characters" ${disabled} /></label>
        ${isLogin ? '' : `<label><span>Confirm password</span><input id="auth-confirm-password" type="password" autocomplete="new-password" placeholder="Repeat your password" ${disabled} /></label>`}
        <p class="auth-message ${state.tone}">${escapeHtml(state.loading ? 'Working...' : state.message)}</p>
        <button id="auth-submit" class="auth-submit" type="submit" ${disabled}>${state.loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}</button>
      </form>
      <p class="login-note">Gameplay requires Supabase login, a profile, and owner approval.</p>
    </div>
  `;
}

export async function showLoginScreen(): Promise<AuthGateContext> {
  const configured = isSupabaseConfigured();
  return new Promise((resolve) => {
    const overlay = document.createElement('section');
    overlay.className = 'login-screen';
    document.body.appendChild(overlay);
    const state: AuthScreenState = {
      mode: 'login', loading: false,
      message: configured ? 'Login with an approved account or register for approval.' : 'Supabase is required to play Tiny Tamer.',
      tone: 'info', user: null, profile: null,
    };

    async function logoutAndRefresh(): Promise<void> {
      await signOut();
      state.user = null; state.profile = null; state.loading = false; state.message = 'Logged out. Login or register to play.'; state.tone = 'info';
      render();
    }

    async function checkSession(): Promise<void> {
      if (!configured) { render(); return; }
      await getCurrentSession();
      const user = await getCurrentUser();
      const profile = user ? await getOrCreateProfile(user) : null;
      state.user = user; state.profile = profile;
      if (user && profile && canPlayOnline(user, profile)) { overlay.remove(); resolve({ user, profile }); return; }
      if (user && profile?.approved === false) { state.message = 'Your account is waiting for approval.'; state.tone = 'info'; }
      render();
    }

    function render(): void {
      if (!configured) {
        overlay.innerHTML = `<div class="login-card auth-shell auth-error-card"><div class="auth-brand"><span class="auth-badge">Database Required</span><h1>Tiny Tamer</h1><p>Supabase is required to play Tiny Tamer.</p></div><p class="auth-message error">Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the app.</p></div>`;
        return;
      }

      if (state.user && state.profile?.approved === false) {
        overlay.innerHTML = renderWaiting(state.user, state.message);
        overlay.querySelector<HTMLButtonElement>('#logout-button')?.addEventListener('click', () => { void logoutAndRefresh(); });
        return;
      }
      overlay.innerHTML = renderAuthForm(state);
      overlay.querySelector<HTMLButtonElement>('#auth-tab-login')?.addEventListener('click', () => { state.mode = 'login'; state.message = 'Login with your approved email and password.'; state.tone = 'info'; render(); });
      overlay.querySelector<HTMLButtonElement>('#auth-tab-register')?.addEventListener('click', () => { state.mode = 'register'; state.message = 'Create an account, then wait for owner approval.'; state.tone = 'info'; render(); });
      overlay.querySelector<HTMLFormElement>('#auth-form')?.addEventListener('submit', (event) => { event.preventDefault(); void submitAuthForm(); });
    }

    async function submitAuthForm(): Promise<void> {
      if (!configured) { state.message = 'Supabase is required to play Tiny Tamer.'; state.tone = 'error'; render(); return; }
      const email = getInputValue(overlay, '#auth-email');
      const password = overlay.querySelector<HTMLInputElement>('#auth-password')?.value ?? '';
      const displayName = getInputValue(overlay, '#auth-display-name');
      const confirmPassword = overlay.querySelector<HTMLInputElement>('#auth-confirm-password')?.value ?? '';
      const validationError = validateEmailPassword(email, password);
      if (validationError) { state.message = validationError; state.tone = 'error'; render(); return; }
      state.loading = true; state.message = state.mode === 'login' ? 'Logging in...' : 'Creating account...'; state.tone = 'info'; render();
      try {
        if (state.mode === 'login') {
          const { user, profile } = await signInWithEmailPassword(email, password);
          state.user = user; state.profile = profile; state.message = profile?.approved ? 'Approved. Entering the game...' : 'Your account is waiting for approval.'; state.tone = profile?.approved ? 'success' : 'info';
        } else {
          if (password !== confirmPassword) throw new Error('Confirm password must match.');
          const { user, profile } = await signUpWithEmailPassword(email, password, displayName);
          state.user = user; state.profile = profile; state.message = profile ? 'Account created. Waiting for approval.' : 'Check your email to confirm your account, then log in.'; state.tone = 'success';
        }
        state.loading = false;
        if (state.user && state.profile && canPlayOnline(state.user, state.profile)) { overlay.remove(); resolve({ user: state.user, profile: state.profile }); return; }
        render();
      } catch (error) {
        state.loading = false; state.message = error instanceof Error ? error.message : 'Authentication failed. Please try again.'; state.tone = 'error'; render();
      }
    }
    void checkSession();
  });
}
