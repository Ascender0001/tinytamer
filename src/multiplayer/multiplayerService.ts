// @ts-nocheck
import * as THREE from 'three';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { createRemotePlayerModel } from '../models/remotePlayerModel';

export class MultiplayerService {
  constructor(scene, localPlayer, gameState, authContext) {
    this.scene = scene;
    this.localPlayer = localPlayer;
    this.gameState = gameState;
    this.authContext = authContext;
    this.status = 'Offline';
    this.channel = null;
    this.remotePlayers = new Map();
    this.lastBroadcast = 0;
    this.lastPosition = new THREE.Vector3(999, 999, 999);
  }

  get onlineCount() {
    return this.remotePlayers.size + (this.status === 'Online' ? 1 : 0);
  }

  async join() {
    if (!isSupabaseConfigured() || !supabase || !this.authContext?.user || this.authContext?.profile?.approved !== true) return;
    this.status = 'Connecting';
    const profile = this.authContext.profile;
    this.channel = supabase.channel('tiny-tamer-world', { config: { presence: { key: this.authContext.user.id } } });

    this.channel.on('broadcast', { event: 'movement' }, ({ payload }) => this.receiveMovement(payload));
    this.channel.on('presence', { event: 'leave' }, ({ key }) => this.removeRemotePlayer(key));

    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.status = 'Online';
        await this.channel.track(this.createPayload(false));
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') this.status = 'Reconnecting/Error';
    });
  }

  createPayload(inBattle) {
    const active = this.gameState.collection.find((c) => c.id === this.gameState.activeCreatureId) ?? this.gameState.collection[0];
    return {
      userId: this.authContext.user.id,
      displayName: this.authContext.profile?.display_name ?? this.authContext.user.email?.split('@')[0] ?? 'Tamer',
      color: this.authContext.profile?.player_color ?? '#72d6c9',
      activeCreatureId: active?.id,
      activeCreatureName: active?.name,
      position: { x: this.localPlayer.mesh.position.x, y: this.localPlayer.mesh.position.y, z: this.localPlayer.mesh.position.z },
      rotation: this.localPlayer.mesh.rotation.y,
      inBattle,
      updatedAt: Date.now(),
    };
  }

  update(delta, inBattle = false) {
    if (this.status !== 'Online' || !this.channel) return;
    const now = performance.now();
    const moved = this.localPlayer.mesh.position.distanceTo(this.lastPosition) > 0.08;
    if (moved && now - this.lastBroadcast > 80) {
      const payload = this.createPayload(inBattle);
      this.channel.send({ type: 'broadcast', event: 'movement', payload });
      this.channel.track(payload);
      this.lastPosition.copy(this.localPlayer.mesh.position);
      this.lastBroadcast = now;
    }

    this.remotePlayers.forEach((remote) => {
      remote.group.position.lerp(remote.targetPosition, 1 - Math.pow(0.005, delta));
      remote.group.rotation.y += Math.atan2(Math.sin(remote.targetRotation - remote.group.rotation.y), Math.cos(remote.targetRotation - remote.group.rotation.y)) * 0.12;
    });
  }

  receiveMovement(payload) {
    if (!payload || payload.userId === this.authContext.user.id) return;
    let remote = this.remotePlayers.get(payload.userId);
    if (!remote) {
      const group = createRemotePlayerModel(payload.color, payload.displayName);
      this.scene.add(group);
      remote = { group, targetPosition: new THREE.Vector3(), targetRotation: 0 };
      this.remotePlayers.set(payload.userId, remote);
    }
    remote.targetPosition.set(payload.position.x, payload.position.y, payload.position.z);
    remote.targetRotation = payload.rotation;
  }

  removeRemotePlayer(userId) {
    const remote = this.remotePlayers.get(userId);
    if (!remote) return;
    this.scene.remove(remote.group);
    this.remotePlayers.delete(userId);
  }

  async leave() {
    if (this.channel && supabase) await supabase.removeChannel(this.channel);
    this.channel = null;
    this.remotePlayers.forEach((_, id) => this.removeRemotePlayer(id));
    this.status = 'Offline';
  }
}
