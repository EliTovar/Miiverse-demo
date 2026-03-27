// three/multiplayer/MultiplayerManager.ts
import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { CharacterController, AnimationName } from '../characters/character-controller';
import { loadFBXCharacter } from '../loaders/character-loader';
import { InputGate } from '../characters/InputGate';

type ClientMode = 'spectator' | 'player';
/* =========================
   Tipos de red
========================= */

interface NetworkPlayer {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { y: number };
  animation?: AnimationName;
}

interface RemotePlayer {
  mesh: THREE.Group;
  controller: CharacterController;
  username: string;
  targetPosition?: THREE.Vector3;
  targetRotationY?: number;
  targetAnimation?: AnimationName;
}

export class MultiplayerManager {
  private socket: Socket;
  private scene: THREE.Scene;

  private mode: ClientMode;

  localController?: CharacterController;
  localPlayer?: THREE.Group;

  private loadingRemotes = new Set<string>();

  private lastSendTime = 0;
  private readonly SEND_INTERVAL = 100; // ms

  remotePlayers = new Map<string, RemotePlayer>();

  constructor(
    socket: Socket,
    scene: THREE.Scene,
    mode: ClientMode // 👈 NUEVO
  ) {
    this.socket = socket;
    this.scene = scene;
    this.mode = mode;

    this.registerEvents();

    //pide la lista cuando el manager inicia.
    this.socket.emit('request-current-players');
  }

  /* =========================
     SOCKET EVENTS
  ========================= */

  private registerEvents() {
    this.socket.on('current-players', (players: NetworkPlayer[]) => {
      players.forEach((p) => {
        if (this.mode === 'player' && p.id === this.socket.id) return;
            this.addRemotePlayer(p);
        });
    });

    this.socket.on('player-joined', (player: NetworkPlayer) => {
      if (this.mode === 'player' && player.id === this.socket.id) return;
        this.addRemotePlayer(player);
    });

    this.socket.on('player-left', (id: string) => {
      if(id === this.socket.id) {
        console.log('🧹 Soy yo, eliminando jugador local');
        this.disposeLocalPlayer();
        return;
      }
      this.removeRemotePlayer(id);
    });

    this.socket.on('player-moved', (data: NetworkPlayer) => {
      if (data.id === this.socket.id) return;
      this.updateRemotePlayer(data);
    });
  }

    setMode(mode: ClientMode) { //role dinamico
    this.mode = mode;
  }


  /* =========================
     LOCAL PLAYER
  ========================= */

  async spawnLocalPlayer() {
    if (this.mode !== 'player') return; //Si no es player entonces no crea avatar

    InputGate.enabled = true; //Reactiva Input

    console.log('🚀 Escena iniciada');
  try {
    const { model, animations } = await loadFBXCharacter();

    this.localPlayer = model;
    this.scene.add(model);

    this.localController = new CharacterController(
      model,
      animations,
      document.body,
      true
    );
  } catch (e) { //Evita que se muera la aplicacion.
    console.error('❌ No se pudo cargar el personaje', e);
  }
}


dispose() {
  console.log('☠️ CharacterController dispose', this);
  InputGate.enabled = false; // 🔒 BLOQUEO TOTAL

  this.loadingRemotes.clear();

  // 🔴 matar controller local
  if (this.localController) {
    this.localController.disable();
    this.localController = undefined;
  }

  if (this.localPlayer) {
    this.scene.remove(this.localPlayer);
    this.localPlayer = undefined;
  }
  

  // 🔴 eliminar remotos
  this.remotePlayers.forEach((remote) => {
    this.scene.remove(remote.mesh);
    remote.controller.dispose?.();
  });
  this.remotePlayers.clear();
  

  // 🔴 quitar listeners del socket
  this.socket.off('current-players');
  this.socket.off('player-joined');
  this.socket.off('player-left');
  this.socket.off('player-moved');

  // 🔴 modo spectator
  this.mode = 'spectator';
}

public disposeLocalPlayer() {
  InputGate.enabled = false;

  if (this.localController) {
    this.localController.disable();   // ⬅️ CLAVE
    this.localController.dispose();
    this.localController = undefined;
  }

  if (this.localPlayer) {
    this.scene.remove(this.localPlayer);
    this.localPlayer = undefined;
  }

  this.mode = 'spectator';
}



  /* =========================
     REMOTE PLAYERS
  ========================= */

  private async addRemotePlayer(player: NetworkPlayer) {

    //Nunca agregarte como como remoto
  if (player.id == this.socket.id) return;
  // 🚫 Ya existe
  if (this.remotePlayers.has(player.id)) return;
  // 🚫 Ya se está cargando
  if (this.loadingRemotes.has(player.id)) return;

  this.loadingRemotes.add(player.id);

  try {
    const { model, animations } = await loadFBXCharacter();

    // ⚠️ Puede que el jugador se haya ido mientras cargaba
    if (this.remotePlayers.has(player.id)) {
      this.loadingRemotes.delete(player.id);
      return;
    }

    model.position.set(
      player.position.x,
      player.position.y,
      player.position.z
    );

    this.scene.add(model);

    const controller = new CharacterController(
      model,
      animations,
      null,
      false
    );

    // 🔥 FORZAR animación inicial
    if (player.animation) {
      controller.play(player.animation);
    }

    this.remotePlayers.set(player.id, {
      mesh: model,
      controller,
      username: player.username,
      targetPosition: model.position.clone(),
      targetRotationY: player.rotation?.y,
      targetAnimation: player.animation,
    });

  } catch (e) {
    console.error('Error cargando remoto', e);
  }

  this.loadingRemotes.delete(player.id);
}

  private updateRemotePlayer(data: NetworkPlayer) {
    const remote = this.remotePlayers.get(data.id);
    if (!remote) return;

    remote.targetPosition?.set(
      data.position.x,
      data.position.y,
      data.position.z
    );

    if (typeof data.rotation?.y === 'number') {
      remote.targetRotationY = data.rotation.y;
    }

    if (data.animation) {
      remote.targetAnimation = data.animation;
    }
  }

  /* =========================
     UPDATE LOOP
  ========================= */

  update(dt: number) {

  // 🔴 UPDATE LOCAL (solo si existe)
  if (this.localController && this.localPlayer) {
    this.localController.update(dt);
  }

  // 🟢 UPDATE REMOTOS (SIEMPRE)
  this.remotePlayers.forEach((remote) => {
    remote.controller.update(dt);

    if (remote.targetPosition) {
      remote.mesh.position.lerp(remote.targetPosition, 0.1);
    }

    if (typeof remote.targetRotationY === 'number') {
      remote.mesh.rotation.y +=
        (remote.targetRotationY - remote.mesh.rotation.y) * 0.1;
    }

    if (
        remote.targetAnimation &&
        remote.controller.currentAnimationName !== remote.targetAnimation
      ) {
        remote.controller.play(remote.targetAnimation);
      }
  });
}


  /* =========================
     NETWORK SYNC
  ========================= */

  sendUpdates(time: number) {
    if (this.mode !== 'player') return;
    if (!this.localController || !this.localPlayer) return;
    if (time - this.lastSendTime < this.SEND_INTERVAL) return;

    this.lastSendTime = time;

    this.socket.emit('update-position', {
      position: this.localPlayer.position,
      rotation: { y: this.localPlayer.rotation.y },
      animation: this.localController.currentAnimationName,
    });
  }

  /* =========================
     CLEANUP
  ========================= */

  private removeRemotePlayer(id: string) {
    const remote = this.remotePlayers.get(id);
    if (!remote) return;

    this.scene.remove(remote.mesh);
    remote.controller.dispose?.();
    this.remotePlayers.delete(id);
  }
}
