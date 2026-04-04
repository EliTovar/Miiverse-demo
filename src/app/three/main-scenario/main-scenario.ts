import { Component, ElementRef, ViewChild, AfterViewInit, inject, OnDestroy } from '@angular/core';
import * as THREE from 'three';

import { SceneManager } from '../../three/core/SceneManager';
import { RendererManager } from '../../three/core/RendererManager';
import { CameraManager } from '../../three/core/CameraManager';
import { CameraBoundaryManager } from '../../three/controls/CameraBoundaryManager';
import { LoopManager } from '../../three/core/LoopManager';
import { ResizeManager } from '../../three/core/ResizeManager';
import { OrbitControlManager } from '../../three/controls/OrbitControlManager';
import { LightsManager } from '../../three/lighting/LightsManager';

import { SteamManager } from '../../three/overwolrd-Online/Games/managers/SteamManager';

import { FloorManager } from '../../three/environment/FloorManager';
import { SocketService } from '../../SocialMedia/services/socket.service';
import { MultiplayerManager } from '../overwolrd-Online/multiplayer/MultiplayerManager';
import { SocialMediaServicie } from '../../SocialMedia/services/social-media.service';
import { effect } from '@angular/core';

// let loopManager: LoopManager | null = null;
// let multiplayer: MultiplayerManager | null = null;

@Component({
  selector: 'main-scenario',
  standalone: true,
  templateUrl: './main-scenario.html',
  styleUrl: './main-scenario.css',
})
export class MainScenario implements AfterViewInit, OnDestroy {
  // private multiplayer?: MultiplayerManager;
  private loopManager?: LoopManager;
  private multiplayer?: MultiplayerManager;

  private sceneManager!: SceneManager;
  private cameraManager!: CameraManager;
  private rendererManager!: RendererManager;

  private steamManager?: SteamManager;

  private unsubscribeMultiplayerLoop: (() => void) | null = null;

  // Helper para esperar conexión
  private waitForSocketConnection(): Promise<void> {
    const socket = this.socketService.getSocket();

    if (socket.connected) return Promise.resolve();

    return new Promise((resolve) => {
      socket.once('connect', () => {
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

    const mode = this.auth.isGuest() ? 'spectator' : 'player';

    console.log('♻️ Recreating MultiplayerManager as', mode);

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
    private auth: SocialMediaServicie

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

    const mode = this.auth.isGuest() ? 'spectator' : 'player';

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

    //loopManager

    /* =========================
       ENVIRONMENT
    ========================= */

    // 🔧 CONFIGURACIÓN DEL TAMAÑO DEL SUELO (Piso)
    new FloorManager(this.sceneManager.scene, 80);
    new LightsManager(this.sceneManager.scene);

    /* =========================
       SOCKET + MULTIPLAYER
    ========================= */

    // this.socketService.connect();

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
    this.loopManager.addUpdateCallback(() => orbitControls.update());

    new ResizeManager(
      this.container.nativeElement,
      this.cameraManager.camera,
      this.rendererManager.renderer
    );

    /* =========================
       DEMO CUBE
    ========================= */

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ color: 0x00ff88 })
    );
    cube.position.y = 1;
    this.sceneManager.add(cube);


    // 🔥 Crear multiplayer inicial una vez que la escena ya existe
    await this.setupMultiplayer();

    /* =========================
       START LOOP
    ========================= */

    this.loopManager.start();

    /* =========================
       STEAM GAMES
    ========================= */

    this.steamManager = new SteamManager(
      this.sceneManager.scene,
      this.cameraManager.camera
    );

    this.loopManager.addUpdateCallback((dt, time) => {
      this.steamManager?.update(dt, time);
    });

    await this.steamManager.init();
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
    this.steamManager?.dispose();
  }
}
