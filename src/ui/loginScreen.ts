// @ts-nocheck
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { getCurrentUser, getOrCreateProfile, isUserApproved, signInWithEmail, signOut } from '../auth/authService';
import { getStorageMode } from '../storage/storageService';

export async function showLoginScreen(): Promise<{ onlineEnabled: boolean; user: any; profile: any }> {
  const configured = isSupabaseConfigured();
  const user = await getCurrentUser();
  let profile = user ? await getOrCreateProfile() : null;
  let approved = user ? (profile?.approved || await isUserApproved(user.id)) : false;

  return new Promise((resolve) => {
    const overlay = document.createElement('section');
    overlay.className = 'login-screen';
    overlay.innerHTML = `
      <div class="login-card">
        <h1>Tiny Tamer</h1>
        <p class="login-subtitle">A cozy creature world with optional friends-only online presence.</p>
        <div class="login-status">
          <span>Storage: ${configured ? 'Supabase ready' : 'Local offline'}</span>
          <span>Mode: ${getStorageMode()}</span>
          <span>${user ? `Signed in as ${user.email}` : 'Not signed in'}</span>
          <span id="approval-status">${approved ? 'Approved for multiplayer' : user ? 'Your account is waiting for approval.' : 'Local play is available.'}</span>
        </div>
        <input id="login-email" type="email" placeholder="email@example.com" ${configured ? '' : 'disabled'} />
        <div class="login-actions">
          <button id="login-button" ${configured ? '' : 'disabled'}>Send Magic Link</button>
          <button id="logout-button" ${user ? '' : 'disabled'}>Logout</button>
          <button id="check-status-button">Check Status</button>
          <button id="offline-button">Play Local</button>
          <button id="online-button" ${approved ? '' : 'disabled'}>Enter Online World</button>
        </div>
        <p class="login-note">Supabase not configured or not approved? You can still play locally.</p>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#login-button').addEventListener('click', async () => {
      const email = overlay.querySelector('#login-email').value;
      if (!email) return;
      await signInWithEmail(email);
      overlay.querySelector('.login-note').textContent = 'Magic link sent. Check your email, then reload after signing in.';
    });
    overlay.querySelector('#logout-button').addEventListener('click', async () => {
      await signOut();
      window.location.reload();
    });
    overlay.querySelector('#check-status-button').addEventListener('click', async () => {
      const note = overlay.querySelector('.login-note');
      const status = overlay.querySelector('#approval-status');
      const onlineButton = overlay.querySelector('#online-button');
      note.textContent = 'Checking approval status...';
      const freshUser = await getCurrentUser();
      if (!freshUser) {
        status.textContent = 'Not signed in. Use the magic link first, or play locally.';
        onlineButton.disabled = true;
        note.textContent = 'No active login session found.';
        return;
      }
      profile = await getOrCreateProfile();
      approved = Boolean(profile?.approved || await isUserApproved(freshUser.id));
      status.textContent = approved ? 'Approved for multiplayer' : freshUser ? 'Your account is waiting for approval.' : 'Not signed in';
      onlineButton.disabled = !approved;
      note.textContent = approved ? 'Approved! You can enter the online world now.' : 'Still waiting for approval. You can keep playing locally.';
    });
    overlay.querySelector('#offline-button').addEventListener('click', () => {
      overlay.remove();
      resolve({ onlineEnabled: false, user, profile });
    });
    overlay.querySelector('#online-button').addEventListener('click', () => {
      overlay.remove();
      resolve({ onlineEnabled: true, user, profile: { ...profile, approved } });
    });
  });
}
