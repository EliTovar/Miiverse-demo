// three/multiplayer/MultiplayerManager.ts
import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { CharacterController, AnimationName } from '../characters/character-controller';
import { loadCharacter } from '../loaders/character-loader';
import { InputGate } from '../characters/InputGate';

type ClientMode = 'spectator' | 'player';

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
  private initialLocalPosition?: THREE.Vector3;
  private initialLocalRotationY?: number;

  private resolveSync!: () => void;
  private syncPromise: Promise<void>;

  private pendingUpdates = new Map<string, NetworkPlayer>();
  private loadingRemotes = new Set<string>();
  private lastSendTime = 0;
  private readonly SEND_INTERVAL = 33; // como máximo 30 envíos por segundo mientras el jugador se mueve
  /** Si el jugador está quieto, se envía igualmente cada segundo ("sigo aquí"), así el servidor guarda su última posición. */
  private readonly IDLE_SEND_INTERVAL = 1000;
  /** Último estado enviado, para no repetir mensajes idénticos 30 veces por segundo. */
  private lastSent?: { x: number; y: number; z: number; rotY: number; animation: string };

  remotePlayers = new Map<string, RemotePlayer>();

  constructor(
    socket: Socket,
    scene: THREE.Scene,
    mode: ClientMode
  ) {
    this.socket = socket;
    this.scene = scene;
    this.mode = mode;

    this.syncPromise = new Promise((res) => {
      this.resolveSync = res;
      // Seguridad: timeout de 1s para no bloquear el spawn si falla la red
      setTimeout(res, 1000);
    });

    this.registerEvents();

    this.socket.emit('request-current-players');
  }

  /* =========================
     SOCKET EVENTS
  ========================= */

  private registerEvents() {
    this.socket.on('current-players', (players: NetworkPlayer[]) => {
      console.log('📡 Jugadores actuales recibidos:', players.length);
      players.forEach((p) => {
        if (this.mode === 'player' && p.id === this.socket.id) {
          // Capturar posición inicial desde persistencia del servidor
          this.initialLocalPosition = new THREE.Vector3(p.position.x, p.position.y, p.position.z);
          this.initialLocalRotationY = p.rotation.y;
          return;
        }
        this.addRemotePlayer(p);
      });
      this.resolveSync();
    });

    this.socket.on('player-joined', (player: NetworkPlayer) => {
      console.log('📡 Nuevo jugador unido:', player.username, player.id);
      if (this.mode === 'player' && player.id === this.socket.id) return;
      this.addRemotePlayer(player);
    });

    this.socket.on('player-left', (id: string) => {
      if (id === this.socket.id) {
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

    this.socket.on('player-posted', (data: { id: string, drawing_url: string }) => {
      console.log('📡 Jugador publicó dibujo:', data.id);
      if (data.id === this.socket.id) return;
      
      const remote = this.remotePlayers.get(data.id);
      if (remote) {
        remote.controller.setSocialBubble(data.drawing_url);
      }
    });
  }

  setMode(mode: ClientMode) {
    this.mode = mode;
  }

  /* =========================
     LOCAL PLAYER
  ========================= */

  async spawnLocalPlayer() {
    if (this.mode !== 'player') return;
    if (this.localPlayer || this.localController) {
      console.warn('⚠️ Local player already spawned, skipping...');
      return;
    }

    InputGate.enabled = true;

    // 🔥 ESPERAR A LOS DATOS DEL SERVIDOR (o al timeout de 1s)
    await this.syncPromise;

    console.log('🚀 Escena iniciada');
    try {
      const { model, animations } = await loadCharacter();

      // 1. Aplicar posición inicial persistente ANTES de dar de alta al jugador
      if (this.initialLocalPosition) {
        model.position.copy(this.initialLocalPosition);
      }
      if (typeof this.initialLocalRotationY === 'number') {
        model.rotation.y = this.initialLocalRotationY;
      }

      // 2. Añadir a la escena
      this.scene.add(model);

      // 3. REGISTRAR EL PLAYER (solo ahora sendUpdates podrá verlo con su posición correcta)
      this.localPlayer = model;

      this.localController = new CharacterController(
        model,
        animations,
        document.body,
        true
      );
    } catch (e) {
      console.error('❌ No se pudo cargar el personaje', e);
    }
  }

  dispose() {
    console.log('☠️ CharacterController dispose', this);
    InputGate.enabled = false;

    this.loadingRemotes.clear();
    this.pendingUpdates.clear();

    if (this.localController) {
      this.localController.disable();
      this.localController.dispose(); // quita sus listeners de teclado de window
      this.localController = undefined;
    }

    if (this.localPlayer) {
      this.scene.remove(this.localPlayer);
      this.localPlayer = undefined;
    }

    this.remotePlayers.forEach((remote) => {
      this.scene.remove(remote.mesh);
      remote.controller.dispose?.();
    });
    this.remotePlayers.clear();

    this.socket.off('current-players');
    this.socket.off('player-joined');
    this.socket.off('player-left');
    this.socket.off('player-moved');
    this.socket.off('player-posted');

    this.mode = 'spectator';
  }

  public disposeLocalPlayer() {
    InputGate.enabled = false;

    if (this.localController) {
      this.localController.disable();
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
    if (player.id == this.socket.id) return;
    if (this.remotePlayers.has(player.id)) return;
    if (this.loadingRemotes.has(player.id)) return;

    this.loadingRemotes.add(player.id);

    try {
      const { model, animations } = await loadCharacter();

      if (this.remotePlayers.has(player.id)) {
        this.loadingRemotes.delete(player.id);
        return;
      }

      const latest = this.pendingUpdates.get(player.id) || player;
      
      model.position.set(
        latest.position.x,
        latest.position.y,
        latest.position.z
      );
      if (typeof latest.rotation?.y === 'number') {
        model.rotation.y = latest.rotation.y;
      }

      this.scene.add(model);

      const controller = new CharacterController(
        model,
        animations,
        null,
        false
      );

      if (latest.animation) {
        controller.play(latest.animation);
      }

      this.remotePlayers.set(player.id, {
        mesh: model,
        controller,
        username: latest.username,
        targetPosition: model.position.clone(),
        targetRotationY: model.rotation.y,
        targetAnimation: latest.animation,
      });

      this.pendingUpdates.delete(player.id);

    } catch (e) {
      console.error('Error cargando remoto', e);
    }

    this.loadingRemotes.delete(player.id);
  }

  private updateRemotePlayer(data: NetworkPlayer) {
    const remote = this.remotePlayers.get(data.id);
    
    if (!remote) {
      if (this.loadingRemotes.has(data.id)) {
        this.pendingUpdates.set(data.id, data);
      }
      return;
    }

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

  private readonly POSITION_THRESHOLD = 0.001;
  private readonly ROTATION_THRESHOLD = 0.001;

  update(dt: number) {
    const clampedDt = Math.min(dt, 0.1); 

    if (this.localController && this.localPlayer) {
      this.localController.update(clampedDt);
    }

    const LERP_FACTOR = 1 - Math.exp(-35 * clampedDt); 

    this.remotePlayers.forEach((remote) => {
      remote.controller.update(clampedDt);

      if (remote.targetPosition) {
        const distSq = remote.mesh.position.distanceToSquared(remote.targetPosition);
        
        if (distSq > 25) { 
          remote.mesh.position.copy(remote.targetPosition);
        } else if (distSq > this.POSITION_THRESHOLD) {
          remote.mesh.position.lerp(remote.targetPosition, LERP_FACTOR);
        } else {
          remote.mesh.position.copy(remote.targetPosition);
        }
      }

      if (typeof remote.targetRotationY === 'number') {
        const currentRot = remote.mesh.rotation.y;
        let diff = remote.targetRotationY - currentRot;
        
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (Math.abs(diff) > this.ROTATION_THRESHOLD) {
          remote.mesh.rotation.y += diff * LERP_FACTOR;
        } else {
          remote.mesh.rotation.y = remote.targetRotationY;
        }
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

    const elapsed = time - this.lastSendTime;
    if (elapsed < this.SEND_INTERVAL) return;

    const { x, y, z } = this.localPlayer.position;
    const rotY = this.localPlayer.rotation.y;
    const animation = this.localController.currentAnimationName;

    // Quieto y sin cambio de animación: no hace falta avisar a nadie salvo el "sigo aquí".
    const last = this.lastSent;
    const unchanged =
      last !== undefined &&
      last.animation === animation &&
      Math.abs(last.x - x) < this.POSITION_THRESHOLD &&
      Math.abs(last.y - y) < this.POSITION_THRESHOLD &&
      Math.abs(last.z - z) < this.POSITION_THRESHOLD &&
      Math.abs(last.rotY - rotY) < this.ROTATION_THRESHOLD;
    if (unchanged && elapsed < this.IDLE_SEND_INTERVAL) return;

    this.lastSendTime = time;
    this.lastSent = { x, y, z, rotY, animation };

    this.socket.emit('update-position', {
      position: { x, y, z },
      rotation: { y: rotY },
      animation,
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
    this.pendingUpdates.delete(id);
  }
}
