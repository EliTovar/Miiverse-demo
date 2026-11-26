import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect } from '@angular/core';
import * as THREE from 'three';
import { Subscription } from 'rxjs';

import { SceneManager } from '../core/SceneManager';
import { RendererManager } from '../core/RendererManager';
import { CameraManager } from '../core/CameraManager';
import { CameraBoundaryManager } from '../controls/CameraBoundaryManager';
import { LoopManager } from '../core/LoopManager';
import { ResizeManager } from '../core/ResizeManager';
import { OrbitControlManager } from '../controls/OrbitControlManager';
import { LightsManager } from '../lighting/LightsManager';
import { DebugHud } from '../debug/DebugHud';
import { WorldBillboards } from '../online/Games/managers/WorldBillboards';

import { FloorManager } from '../environment/FloorManager';
import { SocketService } from '../../core/socket/socket.service';
import { MultiplayerManager } from '../online/multiplayer/MultiplayerManager';
import { AuthStateService } from '../../core/auth/auth-state.service';
import { ComposerService } from '../../social/services/composer.service';

@Component({
  selector: 'main-scenario',
  standalone: true,
  templateUrl: './main-scenario.html',
  styleUrl: './main-scenario.css',
})
export class MainScenario implements AfterViewInit, OnDestroy {
  private loopManager?: LoopManager;
  private multiplayer?: MultiplayerManager;

  private sceneManager!: SceneManager;
  private cameraManager!: CameraManager;
  private rendererManager!: RendererManager;

  private billboards?: WorldBillboards;
  private floorManager?: FloorManager;
  private debugHud?: DebugHud;
  private postCreatedSub?: Subscription;

  private unsubscribeMultiplayerLoop: (() => void) | null = null;

  // Helper para esperar conexión
  private waitForSocketConnection(): Promise<void> {
    const socket = this.socketService.getSocket();

    if (socket.connected) return Promise.resolve();

    return new Promise((resolve) => {
      // Timeout de seguridad: si en 3 segundos no conecta, procedemos igual
      // para no bloquear la carga de la escena principal.
      const timeout = setTimeout(() => {
        console.warn('⚠️ Timeout esperando socket. La escena cargará en modo offline/espectador.');
        resolve();
      }, 3000);

      socket.once('connect', () => {
        clearTimeout(timeout);
        console.log('🟢 Socket listo para multiplayer');
        resolve();
      })
    })
  }

  private async setupMultiplayer() {
    if (!this.loopManager || !this.sceneManager) return;

    // 🧹 Cleanup previous multiplayer loop
    if (this.unsubscribeMultiplayerLoop) {
      this.unsubscribeMultiplayerLoop();
      this.unsubscribeMultiplayerLoop = null;
    }

    console.log('♻️ Recreating MultiplayerManager as', this.auth.isGuest() ? 'spectator' : 'player');

    // 🔥 ESPERAR SOCKET
    await this.waitForSocketConnection();

    this.multiplayer = new MultiplayerManager(
      this.socketService.getSocket(),
      this.sceneManager.scene,
      this.auth.isGuest() ? 'spectator' : 'player'
    );

    if (!this.auth.isGuest()) {
      await this.multiplayer.spawnLocalPlayer();
    }

    this.unsubscribeMultiplayerLoop =
      this.loopManager.addUpdateCallback((dt, time) => {
        this.multiplayer?.update(dt);
        this.multiplayer?.sendUpdates(time);
      });

  }

  constructor(
    private socketService: SocketService,
    private auth: AuthStateService,
    private composerService: ComposerService
  ) {
    effect(() => {
      const role = this.auth.role();
      if (!this.multiplayer) return;

      const mode = role === 'guest' ? 'spectator' : 'player';

      console.log('🔁 Role changed →', role);

      this.multiplayer.setMode(mode);

      if (mode === 'player') {
        this.multiplayer.spawnLocalPlayer();
      } else {
        this.multiplayer.disposeLocalPlayer();
      }
    });
  }

  @ViewChild('canvasContainer', { static: true })
  container!: ElementRef<HTMLDivElement>;

  async ngAfterViewInit(): Promise<void> {
    const width = this.container.nativeElement.clientWidth;
    const height = this.container.nativeElement.clientHeight;

    /* =========================
       CORE
    ========================= */

    this.sceneManager = new SceneManager();
    this.cameraManager = new CameraManager(width, height);
    this.rendererManager = new RendererManager(
      this.container.nativeElement,
      width,
      height
    );

    /* =========================
       ENVIRONMENT
    ========================= */

    // Plaza estilo Wii U: el suelo visual es grande y se funde con la niebla;
    // la zona por la que se camina sigue siendo de 80x80 (CharacterController).
    this.floorManager = new FloorManager(this.sceneManager.scene, 600);
    new LightsManager(this.sceneManager.scene);
    this.sceneManager.setupEnvironment(this.rendererManager.renderer);

    this.loopManager = new LoopManager(
      this.rendererManager.renderer,
      this.sceneManager.scene,
      this.cameraManager.camera
    );

    /* =========================
       CAMERA
    ========================= */

    // 🔧 LÍMITE DE LA CÁMARA (Para no perderse en el vacío)
    const boundaries = new CameraBoundaryManager(
      this.cameraManager.camera,
      500
    );
    this.loopManager.addUpdateCallback(() => boundaries.update());

    const orbitControls = new OrbitControlManager(
      this.cameraManager.camera,
      this.rendererManager.renderer
    );

    // -------------------------------------------------------------------------
    // 🔧 PUNTO DE ENFOQUE INICIAL (Donde mira la cámara al empezar)
    // -------------------------------------------------------------------------
    // Centro de la plaza, para encuadrar el óvalo de iconos.
    orbitControls.controls.target.set(0, 6, 6);
    // -------------------------------------------------------------------------

    this.loopManager.addUpdateCallback(() => orbitControls.update());

    // 🛠️ DEBUG HUD (Coordenadas en pantalla + FPS + Draggable)
    const debugHud = new DebugHud(this.cameraManager.camera, orbitControls.controls.target);
    this.debugHud = debugHud;
    this.loopManager.addUpdateCallback(() => debugHud.update());

    new ResizeManager(
      this.container.nativeElement,
      this.cameraManager.camera,
      this.rendererManager.renderer
    );

    // 🔥 Crear multiplayer inicial una vez que la escena ya existe
    await this.setupMultiplayer();

    // 🎨 CONEXIÓN COMPOSER -> 3D BUBBLE
    this.postCreatedSub = this.composerService.postCreated.subscribe((post) => {
      if (post.drawing_url && this.multiplayer?.localController) {
        // 1. Mostrar localmente
        this.multiplayer.localController.setSocialBubble(post.drawing_url);
        
        // 2. Notificar al servidor para que otros lo vean
        this.socketService.getSocket().emit('show-post-bubble', { 
            drawing_url: post.drawing_url 
        });
      }
    });

    /* =========================
       START LOOP
    ========================= */

    this.loopManager.start();
    /* =========================
       CARTELES (Steam, Discord, Spotify, AniList, Pixiv, Top Players)
    ========================= */
    const billboards = new WorldBillboards(this.sceneManager.scene, this.cameraManager.camera);
    this.billboards = billboards;
    await billboards.init();

    this.loopManager.addUpdateCallback((dt, time) => {
      // Jugadores que un cartel puede tapar (local + remotos)
      const players: THREE.Object3D[] = [];
      if (this.multiplayer?.localPlayer) players.push(this.multiplayer.localPlayer);
      this.multiplayer?.remotePlayers.forEach(p => players.push(p.mesh));

      billboards.update(dt, time, players);

      // Billboard logic para las burbujas sociales (Mirar cámara)
      if (this.multiplayer) {
        // Local
        const localPos = this.multiplayer.localPlayer?.position;
        if (localPos) {
          this.multiplayer.localController?.socialBubble?.update(this.cameraManager.camera, localPos);
        }

        // Remotos
        this.multiplayer.remotePlayers.forEach(p => {
          p.controller.socialBubble?.update(this.cameraManager.camera, p.mesh.position);
        });
      }
    });
  }

  ngOnDestroy(): void {
    console.log('💀 MainScenario DESTROYED - Cleaning up...');

    if (this.unsubscribeMultiplayerLoop) {
      this.unsubscribeMultiplayerLoop();
    }

    if (this.multiplayer) {
      this.multiplayer.dispose();
    }

    if (this.loopManager) {
      this.loopManager.stop();
    }
    this.postCreatedSub?.unsubscribe();
    this.billboards?.dispose();
    this.debugHud?.dispose();
    this.floorManager?.dispose();
    this.sceneManager?.dispose();
  }
}
