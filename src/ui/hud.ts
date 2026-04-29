// @ts-nocheck
export function createHud(root, gameState, audioManager, world, storageInfo) {
  let collectionOpen = false;
  let toggleHandler = null;
  let muteHandler = null;
  let logoutHandler = null;
  let multiplayerStatus = 'Offline';
  let onlineCount = 0;

  function renderCollection() {
    return `
      <aside class="collection-panel ${collectionOpen ? 'open' : ''}">
        <div class="panel-title">
          <h2>Creature Collection</h2>
          <span>${gameState.collection.length} total</span>
        </div>
        <div class="collection-list">
          ${gameState.collection.map((creature) => `
            <article class="collection-item ${creature.id === gameState.activeCreatureId ? 'active' : ''}">
              <div class="mini-creature" style="--creature-color:${creature.color}"></div>
              <div>
                <h3>${creature.name} <span>Lv. ${creature.level ?? 1}</span></h3>
                <p>${creature.type} • HP ${creature.currentHp ?? creature.maxHp}/${creature.maxHp} • XP ${creature.xp ?? 0}/${creature.xpToNextLevel ?? 35}</p>
                <p>ATK ${creature.attack} · DEF ${creature.defense} · SPD ${creature.speed}</p>
                <p class="move-list">${(creature.moves ?? []).map((move) => `${move.name} (${move.type})`).join(' · ')}</p>
                <button class="set-active" data-active-id="${creature.id}">${creature.id === gameState.activeCreatureId ? 'Active Buddy' : 'Set Active'}</button>
                <small>${creature.description}</small>
              </div>
            </article>
          `).join('')}
        </div>
      </aside>
    `;
  }

  function render() {
    const active = gameState.collection.find((creature) => creature.id === gameState.activeCreatureId) ?? gameState.collection[0];
    const appMode = 'Online Mode';
    const playerLabel = storageInfo?.playerLabel ? ` · ${storageInfo.playerLabel}` : '';
    const exitLabel = 'Logout';
    root.innerHTML = `
      <header class="hud">
        <div>
          <h1>Tiny Tamer</h1>
          <p>WASD / arrows · Search tall grass <span class="seed-label">Seed ${world?.seed ?? 'fresh'}</span></p>
        </div>
        <div class="hud-actions">
          <span class="active-pill">${active?.name ?? 'No buddy'} Lv. ${active?.level ?? 1}</span>
          <span class="caught-pill">${appMode}${playerLabel}</span>
          <span class="caught-pill">Cloud · ${storageInfo?.getSaveStatus?.() ?? 'Idle'}</span>
          <span class="caught-pill">${multiplayerStatus} · ${onlineCount} online</span>
          <span class="caught-pill">Caught: ${gameState.collection.length}</span>
          <button id="mute-toggle" class="sound-button">${audioManager?.muted ? '🔇 Muted' : '🎵 Music'}</button>
          <button id="collection-toggle">${collectionOpen ? 'Close' : 'Open'} Collection</button>
          <button id="logout-toggle" class="logout-button">${exitLabel}</button>
        </div>
      </header>
      <div class="toast" id="toast"></div>
      ${renderCollection()}
    `;

    root.querySelector('#collection-toggle').addEventListener('click', () => toggleHandler?.());
    root.querySelector('#mute-toggle').addEventListener('click', () => muteHandler?.());
    root.querySelector('#logout-toggle').addEventListener('click', () => logoutHandler?.());
    root.querySelectorAll('[data-active-id]').forEach((button) => {
      button.addEventListener('click', () => {
        gameState.activeCreatureId = button.dataset.activeId;
        render();
      });
    });
  }

  render();

  return {
    update: render,
    toggleCollection() {
      collectionOpen = !collectionOpen;
      render();
    },
    onToggleCollection(handler) {
      toggleHandler = handler;
    },
    onToggleMute(handler) {
      muteHandler = handler;
    },
    onLogout(handler) {
      logoutHandler = handler;
    },
    flashMessage(message) {
      const toast = root.querySelector('#toast');
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
    },
    setMultiplayerStatus(status, count) {
      multiplayerStatus = status;
      onlineCount = count;
    },
  };
}

