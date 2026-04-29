// @ts-nocheck
import * as THREE from 'three';
import './style.css';
import { createScene } from './world/createScene';
import { createWorld } from './world/createWorld';
import { PlayerController } from './world/player';
import { InputController } from './world/input';
import { EncounterManager } from './world/encounters';
import { BattleSystem } from './battle/battleSystem';
import { createHud } from './ui/hud';
import { loadPlayerData, savePlayerData, getStorageMode, getSaveStatus } from './storage/storageService';
import { AudioManager } from './audio/audioManager';
import { MovementParticles } from './effects/movementParticles';
import { showLoginScreen } from './ui/loginScreen';
import { MultiplayerService } from './multiplayer/multiplayerService';
import { canPlayOnline, signOut } from './auth/authService';

const canvas = document.querySelector('#game-canvas');
const hudRoot = document.querySelector('#hud-root');
const battleRoot = document.querySelector('#battle-root');

async function bootstrap() {
  const authContext = await showLoginScreen();
  if (authContext.mode === 'online' && !canPlayOnline(authContext.user, authContext.profile)) return;

  const gameState = await loadPlayerData(authContext.mode, authContext.user?.id);
  if (!gameState.activeCreatureId) gameState.activeCreatureId = gameState.collection[0]?.id ?? null;

  const sceneBundle = createScene(canvas);
  const { scene, camera, renderer } = sceneBundle;
  const world = createWorld(scene);
  const input = new InputController();
  const player = new PlayerController(scene, world);
  const audio = new AudioManager();
  const movementParticles = new MovementParticles(scene);
  const playerLabel = authContext.profile?.display_name ?? authContext.user?.email ?? '';
  const hud = createHud(hudRoot, gameState, audio, world, { getStorageMode, getSaveStatus, appMode: authContext.mode, playerLabel });
  const multiplayer = new MultiplayerService(scene, player, gameState, authContext);
  await multiplayer.join();

  let overworldPaused = false;
  let gameStopped = false;
  let encounters;

  const battleSystem = new BattleSystem({
    root: battleRoot,
    gameState,
    onEnd: (resultMessage) => {
      overworldPaused = false;
      encounters.addCooldown(3.5);
      savePlayerData(gameState).then(() => hud.update());
      hud.update();
      hud.flashMessage(resultMessage);
    },
  });

  encounters = new EncounterManager({
    grassZones: world.grassZones,
    onEncounter: (wildCreature) => {
      overworldPaused = true;
      audio.encounter();
      battleSystem.start(wildCreature);
    },
  });

  hud.onToggleCollection(() => hud.toggleCollection());
  hud.onToggleMute(async () => {
    await audio.start();
    const muted = audio.toggleMute();
    hud.update();
    hud.flashMessage(muted ? 'Music muted.' : 'Music playing softly.');
  });
  hud.onLogout(async () => {
    gameStopped = true;
    overworldPaused = true;
    input.keys?.clear?.();
    await multiplayer.leave();
    if (authContext.mode === 'online') await signOut();
    window.location.reload();
  });

  window.addEventListener('pointerdown', () => audio.start(), { once: true });
  window.addEventListener('keydown', () => audio.start(), { once: true });
  hud.flashMessage('Welcome to Tiny Tamer! Explore the grass to meet tiny wild friends.');

  const clock = new THREE.Clock();

  function updateCamera(delta) {
    const target = player.mesh.position;
    const cameraOffset = new THREE.Vector3(7.4, 8.2, 7.4);
    const desiredPosition = target.clone().add(cameraOffset);
    camera.position.lerp(desiredPosition, 1 - Math.pow(0.001, delta));
    camera.lookAt(target.x, target.y + 0.7, target.z);
  }

  function animate() {
    if (gameStopped) return;
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    if (!overworldPaused) {
      player.update(delta, input);
      encounters.update(delta, player.mesh.position, input.isMoving());
    }
    multiplayer.update(delta, overworldPaused);
    hud.setMultiplayerStatus?.(multiplayer.status, multiplayer.onlineCount);
    const inGrass = world.grassZones.some((zone) => Math.abs(player.mesh.position.x - zone.x) <= zone.width / 2 && Math.abs(player.mesh.position.z - zone.z) <= zone.depth / 2);
    movementParticles.update(delta, player, overworldPaused, inGrass);
    world.animate(delta);
    updateCamera(delta);
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
}

bootstrap();

