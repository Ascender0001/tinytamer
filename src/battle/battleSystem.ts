// @ts-nocheck
import * as THREE from 'three';
import { cloneCreature } from './creatures';
import { calculateXpGain, gainXp } from './leveling';
import { getEffectivenessMessage, getTypeEffectiveness } from './typeChart';
import { createCreatureModel, updateCreatureModel } from '../models/creatureModels';

const BATTLE_STATES = Object.freeze({ IDLE: 'IDLE', INTRO: 'INTRO', PLAYER_CHOICE: 'PLAYER_CHOICE', MOVE_CHOICE: 'MOVE_CHOICE', PLAYER_ACTION: 'PLAYER_ACTION', ENEMY_ACTION: 'ENEMY_ACTION', ENDING: 'ENDING' });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function hpPercent(creature) {
  if (!creature?.maxHp) return 0;
  return Math.max(0, Math.min(100, Math.round((creature.currentHp / creature.maxHp) * 100)));
}

function hpState(creature) {
  const percent = hpPercent(creature);
  if (percent <= 25) return 'danger';
  if (percent <= 55) return 'warning';
  return 'healthy';
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function calculateDamage(attacker, defender, move) {
  const effectiveness = getTypeEffectiveness(move.type, defender.type);
  const variance = 0.9 + Math.random() * 0.2;
  const raw = (((attacker.level * 2 + 8) / 10) * move.power * (attacker.attack / Math.max(1, defender.defense))) / 4;
  return { damage: Math.max(1, Math.floor(raw * effectiveness * variance)), effectiveness };
}

export class BattleSystem {
  constructor({ root, gameState, onEnd }) {
    this.root = root;
    this.gameState = gameState;
    this.onEnd = onEnd;
    this.state = BATTLE_STATES.IDLE;
    this.wild = null;
    this.playerCreature = null;
    this.message = '';
    this.isResolvingAction = false;
    this.actionInProgress = false;
    this.endToken = 0;
    this.flashTarget = null;
    this.menu = 'main';
    this.showCreaturePanel = false;
    this.previewModels = [];
    this.root.innerHTML = '';

    this.root.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button || !this.root.contains(button)) return;
      this.handleAction(button.dataset.action, button.dataset.moveIndex);
    });
  }

  setState(nextState) {
    if (this.state === nextState) return;
    console.log(`[Tiny Tamer Battle] ${this.state} -> ${nextState}`);
    this.state = nextState;
  }

  start(wildCreature) {
    if (!wildCreature) return console.error('BattleSystem.start called without a wild creature.');
    this.endToken += 1;
    this.wild = cloneCreature(wildCreature);
    this.playerCreature = this.getReadyPlayerCreature();
    this.isResolvingAction = false;
    this.actionInProgress = false;
    this.flashTarget = null;
    this.menu = 'main';
    this.showCreaturePanel = false;

    if (!this.playerCreature) return this.forceCleanup('No battle buddy was available.');
    if (!Number.isFinite(this.playerCreature.currentHp) || this.playerCreature.currentHp <= 0) this.playerCreature.currentHp = this.playerCreature.maxHp;
    if (!Number.isFinite(this.wild.currentHp) || this.wild.currentHp <= 0) this.wild.currentHp = this.wild.maxHp;

    this.message = `A wild Lv. ${this.wild.level} ${this.wild.name} appeared!`;
    this.setState(BATTLE_STATES.INTRO);
    this.render();
    setTimeout(() => {
      if (this.state === BATTLE_STATES.INTRO && this.wild && this.playerCreature) this.unlockChoice('What will you do?');
    }, 450);
  }

  getReadyPlayerCreature() {
    if (!Array.isArray(this.gameState.collection)) this.gameState.collection = [];
    const active = this.gameState.collection.find((creature) => creature.id === this.gameState.activeCreatureId);
    return active ?? this.gameState.collection[0] ?? null;
  }

  canChooseAction() {
    return (this.state === BATTLE_STATES.PLAYER_CHOICE || this.state === BATTLE_STATES.MOVE_CHOICE) && !this.isResolvingAction && !this.actionInProgress;
  }

  hasValidBattleState(actionName) {
    const valid = this.wild && this.playerCreature && this.wild.currentHp > 0 && this.playerCreature.currentHp > 0;
    if (!valid) console.error(`Invalid battle state during ${actionName}.`, { state: this.state, wild: this.wild, playerCreature: this.playerCreature });
    return valid;
  }

  setMainButtonsEnabled(enabled) {
    this.root.querySelectorAll('.action-menu:not(.move-menu) button[data-action]').forEach((button) => { button.disabled = !enabled; });
  }

  setMoveButtonsEnabled(enabled) {
    this.root.querySelectorAll('.move-menu button[data-action="move"]').forEach((button) => { button.disabled = !enabled; });
  }

  setBattleButtonsEnabled(enabled) {
    this.setMainButtonsEnabled(enabled);
    this.setMoveButtonsEnabled(enabled);
  }

  async handleAction(action, moveIndex) {
    if (action === 'close-creatures' || action === 'back-main') {
      this.showCreaturePanel = false;
      this.menu = 'main';
      this.render();
      return;
    }
    if (!this.canChooseAction()) return;
    if (action === 'fight') return this.openMoveMenu();
    if (action === 'move') return this.resolveMove(this.playerCreature.moves[Number(moveIndex)], this.playerCreature, this.wild, 'enemy');
    if (action === 'catch') return this.resolveCatch();
    if (action === 'creature') return this.openCreaturePanel();
    if (action === 'switch') return this.resolveSwitch(buttonCreature(this.gameState.collection, moveIndex));
    if (action === 'run') return this.resolveRun();
  }

  openMoveMenu() {
    this.menu = 'moves';
    this.setState(BATTLE_STATES.MOVE_CHOICE);
    this.message = `Choose a move for ${this.playerCreature.name}.`;
    this.render();
  }

  async resolveMove(move, attacker, defender, targetSide) {
    if (!move || !attacker || !defender) {
      console.error('Missing move or creature during battle action.', { move, attacker, defender });
      this.message = 'Something startled the creatures. The battle ended safely.';
      this.render();
      await sleep(700);
      return this.end('The battle ended safely.');
    }

    if (!this.hasValidBattleState('move')) return this.unlockChoice();

    this.isResolvingAction = true;
    this.actionInProgress = true;
    try {
      console.log('[Tiny Tamer Battle] selected move', { attacker, defender, move });
      this.setState(attacker === this.playerCreature ? BATTLE_STATES.PLAYER_ACTION : BATTLE_STATES.ENEMY_ACTION);
      this.menu = 'main';
      this.showCreaturePanel = false;
      this.message = `${attacker.name} used ${move.name}!`;
      this.render();
      this.setBattleButtonsEnabled(false);
      await sleep(600);

      if (Math.random() > move.accuracy) {
        this.message = 'It missed!';
        this.render();
        await sleep(650);
      } else {
        const { damage, effectiveness } = calculateDamage(attacker, defender, move);
        defender.currentHp = Math.max(0, defender.currentHp - damage);
        this.flashTarget = targetSide;
        this.message = `${move.name} dealt ${damage} damage!`;
        this.render();
        await sleep(550);
        const effectMessage = getEffectivenessMessage(effectiveness);
        if (effectMessage) {
          this.message = effectMessage;
          this.render();
          await sleep(650);
        }
        this.flashTarget = null;
      }

      if (defender.currentHp <= 0) {
        if (defender === this.wild) return this.awardXpAndEnd();
        this.playerCreature.currentHp = this.playerCreature.maxHp;
        return this.finishBattle(`${this.playerCreature.name} needs a snack break!`, `${this.playerCreature.name} recovered after a short rest.`);
      }

      if (attacker === this.playerCreature) return this.resolveEnemyTurn();
      return this.unlockChoice('What will you do?');
    } finally {
      if (this.state !== BATTLE_STATES.ENDING && this.state !== BATTLE_STATES.IDLE) {
        this.actionInProgress = false;
      }
    }
  }

  async awardXpAndEnd() {
    const xpGain = calculateXpGain(this.wild.level);
    const index = this.gameState.collection.findIndex((creature) => creature.id === this.playerCreature.id);
    const { creature, messages } = gainXp(this.playerCreature, xpGain);
    this.playerCreature = creature;
    if (index >= 0) this.gameState.collection[index] = creature;

    this.message = `${this.wild.name} retreated. ${creature.name} gained ${xpGain} XP!`;
    this.render();
    await sleep(850);
    for (const levelMessage of messages) {
      this.message = levelMessage;
      this.render();
      await sleep(850);
    }
    return this.finishBattle('The grass is calm again.', `${creature.name} gained ${xpGain} XP.`);
  }

  async resolveCatch() {
    if (!this.hasValidBattleState('catch')) return;
    this.isResolvingAction = true;
    this.actionInProgress = true;
    this.setState(BATTLE_STATES.PLAYER_ACTION);
    this.menu = 'main';
    this.message = 'You threw a Tame Orb!';
    this.render();
    this.setBattleButtonsEnabled(false);
    await sleep(700);

    const remainingHpRatio = Math.max(0, this.wild.currentHp / this.wild.maxHp);
    const chance = Math.min(0.92, Math.max(0.05, this.wild.catchRate + (1 - remainingHpRatio) * 0.45 - this.wild.level * 0.01));
    if (Math.random() < chance) {
      const captured = cloneCreature(this.wild);
      captured.currentHp = captured.maxHp;
      this.gameState.collection.push(captured);
      return this.finishBattle(`${this.wild.name} was tamed and joined your collection!`, `${this.wild.name} was added to your collection!`);
    }
    this.message = `${this.wild.name} broke free!`;
    this.render();
    await sleep(700);
    return this.resolveEnemyTurn();
  }

  async resolveEnemyTurn() {
    if (!this.hasValidBattleState('enemy turn')) return this.unlockChoice();
    const enemyMove = randomChoice(this.wild.moves ?? []);
    if (!enemyMove) {
      console.error('Enemy has no moves.', this.wild);
      return this.unlockChoice(`${this.wild.name} looked confused.`);
    }
    return this.resolveMove(enemyMove, this.wild, this.playerCreature, 'player');
  }

  async resolveRun() {
    this.isResolvingAction = true;
    this.actionInProgress = true;
    this.setState(BATTLE_STATES.ENDING);
    this.message = 'You got away safely!';
    this.render();
    await sleep(450);
    this.end('You slipped away safely.');
  }

  openCreaturePanel() {
    this.showCreaturePanel = true;
    this.menu = 'creatures';
    this.setState(BATTLE_STATES.MOVE_CHOICE);
    this.message = 'Your tiny team is ready to cheer you on!';
    this.render();
  }

  async resolveSwitch(nextCreature) {
    if (!nextCreature || nextCreature.id === this.playerCreature?.id || nextCreature.currentHp <= 0) return;
    this.isResolvingAction = true;
    this.actionInProgress = true;
    this.setState(BATTLE_STATES.PLAYER_ACTION);
    const previous = this.playerCreature;
    this.playerCreature = nextCreature;
    this.gameState.activeCreatureId = nextCreature.id;
    this.showCreaturePanel = false;
    this.menu = 'main';
    this.message = `Come back, ${previous.name}! Go, ${nextCreature.name}!`;
    this.render();
    await sleep(750);
    return this.resolveEnemyTurn();
  }

  unlockChoice(message = 'What will you do?') {
    if (!this.wild || !this.playerCreature) return;
    this.isResolvingAction = false;
    this.actionInProgress = false;
    this.setState(BATTLE_STATES.PLAYER_CHOICE);
    this.menu = 'main';
    this.message = message;
    this.render();
    this.setBattleButtonsEnabled(true);
  }

  async finishBattle(displayMessage, resultMessage) {
    this.setState(BATTLE_STATES.ENDING);
    this.isResolvingAction = true;
    this.message = displayMessage;
    this.render();
    await sleep(850);
    this.end(resultMessage);
  }

  end(message) {
    const token = (this.endToken += 1);
    this.setState(BATTLE_STATES.IDLE);
    this.isResolvingAction = false;
    this.actionInProgress = false;
    this.showCreaturePanel = false;
    this.root.querySelector('.battle-overlay')?.classList.remove('active');
    setTimeout(() => {
      if (token !== this.endToken) return;
      this.root.innerHTML = '';
      this.disposePreviewModels();
      this.wild = null;
      this.playerCreature = null;
      this.flashTarget = null;
      this.onEnd(message);
    }, 260);
  }

  forceCleanup(message) {
    this.setState(BATTLE_STATES.IDLE);
    this.root.innerHTML = '';
    this.disposePreviewModels();
    this.wild = null;
    this.playerCreature = null;
    this.isResolvingAction = false;
    this.actionInProgress = false;
    this.onEnd(message);
  }

  render() {
    if (this.state === BATTLE_STATES.IDLE || !this.wild || !this.playerCreature) return;
    this.disposePreviewModels();
    this.root.innerHTML = `
      <section class="battle-overlay active" aria-live="polite">
        <div class="rpg-battle-card">
          <div class="battlefield">
            ${this.renderStatusPanel(this.wild, 'Wild', 'enemy')}
            ${this.renderCreatureSprite(this.wild, 'enemy')}
            ${this.renderCreatureSprite(this.playerCreature, 'player')}
            ${this.renderStatusPanel(this.playerCreature, 'Buddy', 'player')}
          </div>
          <div class="rpg-bottom-row">
            <div class="dialogue-box"><p>${this.message}</p></div>
            ${this.menu === 'moves' ? this.renderMoveMenu() : this.renderMainMenu()}
          </div>
          ${this.showCreaturePanel ? this.renderCreaturePanel() : ''}
        </div>
      </section>`;
    this.setBattleButtonsEnabled(this.canChooseAction());
    this.mountCreaturePreviews();
  }

  disposePreviewModels() {
    this.previewModels?.forEach(({ renderer, animationId }) => {
      cancelAnimationFrame(animationId);
      renderer.dispose();
      renderer.domElement.remove();
    });
    this.previewModels = [];
  }

  mountCreaturePreviews() {
    this.root.querySelectorAll('[data-creature-preview]').forEach((element) => {
      const side = element.dataset.creaturePreview;
      const creature = side === 'enemy' ? this.wild : this.playerCreature;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
      camera.position.set(0, 0.9, 3.4);
      camera.lookAt(0, 0.48, 0);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x9ec8b8, 2.6));
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(2, 4, 3);
      scene.add(key);
      const model = createCreatureModel(creature, { scale: side === 'player' ? 1.45 : 1.25 });
      model.position.y = -0.45;
      model.userData.phase = side === 'enemy' ? 0.7 : 0;
      scene.add(model);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(element.clientWidth || 180, element.clientHeight || 180);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      element.appendChild(renderer.domElement);
      const animate = () => {
        updateCreatureModel(model, performance.now() * 0.001);
        renderer.render(scene, camera);
        const record = this.previewModels.find((item) => item.renderer === renderer);
        if (record) record.animationId = requestAnimationFrame(animate);
      };
      this.previewModels.push({ renderer, animationId: requestAnimationFrame(animate) });
    });
  }

  renderMainMenu() {
    return `<nav class="action-menu"><button data-action="fight">Fight</button><button data-action="catch">Catch</button><button data-action="creature">Creature</button><button data-action="run">Run</button></nav>`;
  }

  renderMoveMenu() {
    return `<nav class="action-menu move-menu">${(this.playerCreature.moves ?? []).map((move, index) => `<button data-action="move" data-move-index="${index}"><strong>${move.name}</strong><small>${move.type} · Pow ${move.power} · ${Math.round(move.accuracy * 100)}%</small></button>`).join('')}<button data-action="back-main">Back</button></nav>`;
  }

  renderStatusPanel(creature, label, side) {
    return `<article class="battle-status ${side}"><span>${label}</span><h2>${creature.name} <small>Lv. ${creature.level}</small></h2><small>${creature.type} type · SPD ${creature.speed}</small><div class="hp-row"><span>HP</span><strong>${Math.max(0, creature.currentHp)} / ${creature.maxHp}</strong></div><div class="hp-bar ${hpState(creature)}"><i style="width:${hpPercent(creature)}%"></i></div>${side === 'player' ? `<div class="xp-bar"><i style="width:${Math.round(((creature.xp ?? 0) / (creature.xpToNextLevel ?? 1)) * 100)}%"></i></div>` : ''}</article>`;
  }

  renderCreatureSprite(creature, side) {
    return `<div class="battle-creature model-preview ${side} ${this.flashTarget === side ? 'hit' : ''}" data-creature-preview="${side}" style="--creature-color:${creature.color};--creature-secondary:${creature.secondaryColor ?? creature.color}"></div>`;
  }

  renderCreaturePanel() {
    const creatures = Array.isArray(this.gameState.collection) ? this.gameState.collection : [];
    return `<aside class="battle-team-panel"><div class="panel-title"><h2>Switch Creature</h2><button data-action="close-creatures">Back</button></div><div class="collection-list compact">${creatures.map((creature, index) => {
      const active = creature.id === this.playerCreature?.id;
      const fainted = (creature.currentHp ?? creature.maxHp) <= 0;
      return `<article class="collection-item switch-card ${active ? 'active' : ''} ${fainted ? 'fainted' : ''}"><div class="mini-creature" style="--creature-color:${creature.color}"></div><div><h3>${creature.name} <span>Lv. ${creature.level}</span></h3><p>${creature.type} • HP ${creature.currentHp ?? creature.maxHp}/${creature.maxHp} ${fainted ? '• Fainted' : ''}</p><p>ATK ${creature.attack} · DEF ${creature.defense} · SPD ${creature.speed}</p><button data-action="switch" data-move-index="${index}" ${active || fainted ? 'disabled' : ''}>${active ? 'Active' : fainted ? 'Fainted' : 'Switch In'}</button></div></article>`;
    }).join('')}</div></aside>`;
  }
}

function buttonCreature(collection, index) {
  return Array.isArray(collection) ? collection[Number(index)] : null;
}

