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

import { SteamBillboardManager } from '../../three/overwolrd-Online/Games/managers/SteamBillboardManager';
import { SteamService } from '../../three/overwolrd-Online/Games/services/SteamService.service';
import { DiscordService } from '../../three/overwolrd-Online/Games/services/DiscordService.service';

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

  private steamManagers: SteamBillboardManager[] = [];

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

    // -------------------------------------------------------------------------
    // 🔧 PUNTO DE ENFOQUE INICIAL (Donde mira la cámara al empezar)
    // -------------------------------------------------------------------------
    // orbitControls.controls.target.set(0, 0, 0); // Apunta al centro (0,0,0)
    // -------------------------------------------------------------------------

    this.loopManager.addUpdateCallback(() => orbitControls.update());

    // -------------------------------------------------------------------------
    // 🛠️ DEBUG HUD (Coordenadas en pantalla)
    // -------------------------------------------------------------------------
    const debugHud = document.createElement('div');
    debugHud.style.position = 'absolute';
    debugHud.style.top = '10px';
    debugHud.style.left = '10px';
    debugHud.style.padding = '10px';
    debugHud.style.background = 'rgba(0, 0, 0, 0.7)';
    debugHud.style.color = '#00ff00';
    debugHud.style.fontFamily = 'monospace';
    debugHud.style.fontSize = '12px';
    debugHud.style.borderRadius = '5px';
    debugHud.style.pointerEvents = 'none';
    debugHud.style.zIndex = '1000';
    document.body.appendChild(debugHud);

    this.loopManager.addUpdateCallback(() => {
      const pos = this.cameraManager.camera.position;
      const target = orbitControls.controls.target;
      debugHud.innerHTML = `
        <div style="color: #ffaa00; font-weight: bold; margin-bottom: 5px;">🎥 CAMERA DEBUG</div>
        Cam Pos: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}<br>
        Target: ${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}
      `;
    });

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
       STEAM GAMES (DUAL BILLBOARDS)
    ========================= */
    const steamService = new SteamService();

    // 1. Cartel de Tendencias (Trending) - Izquierda
    const trendingManager = new SteamBillboardManager(
      this.sceneManager.scene,
      this.cameraManager.camera,
      {
        title: 'Trending Now',
        subtitle: 'Top by Concurrent Players',
        icon: '🔥',
        color: '#66c0f4',
        position: { x: -10.27, y: 16.27, z: -50 }, 
        size: { w: 16.4, h: 16.4, r: 2.0 },
        fetchMethod: () => steamService.getTrendingGames()
      }
    );

    // 2. Cartel de Novedades (Recent) - Derecha
    const recentManager = new SteamBillboardManager(
      this.sceneManager.scene,
      this.cameraManager.camera,
      {
        title: 'New Releases',
        subtitle: 'Latest on Steam Store',
        icon: '✨',
        color: '#00ff88',
        position: { x: 10.27, y: 16.27, z: -50 }, 
        size: { w: 16.4, h: 16.4, r: 2.0 },
        fetchMethod: () => steamService.getRecentGames()
      }
    );

    /* =========================
       DISCORD BOTS (TOP.GG)
    ========================= */
    const discordService = new DiscordService();

    // 3. Cartel de Top Discord Bots - Centro/Atrás
    // -------------------------------------------------------------------------
    // 🎮 POSICIÓN DEL CARTEL DISCORD (MODIFICA AQUÍ)
    // x: Izquierda(-) / Derecha(+)  |  y: Altura  |  z: Profundidad
    // -------------------------------------------------------------------------
    const discordManager = new SteamBillboardManager(
      this.sceneManager.scene,
      this.cameraManager.camera,
      {
        title: 'Top Discord Bots',
        subtitle: 'Most Voted on Top.gg',
        icon: '🤖',
        color: '#7289da', // Color Discord Blurple
        position: { x: 0, y: 16.27, z: -70 },
        size: { w: 16.4, h: 16.4, r: 2.0 },
        fetchMethod: async () => {
          const bots = await discordService.getTopBots();
          // Mapear a la interfaz SteamGame para compatibilidad con el billboard
          return bots.map(bot => ({
            appid: parseInt(bot.id) || 0,
            name: bot.name,
            image: bot.image // Widget PNG de Top.gg
          }));
        }
      }
    );

    this.steamManagers = [trendingManager, recentManager, discordManager];

    // Inicializar todos
    await Promise.all(this.steamManagers.map(m => m.init()));

    // Añadir al loop de actualización
    this.loopManager.addUpdateCallback((dt, time) => {
      this.steamManagers.forEach(m => m.update(dt, time));
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
    this.steamManagers.forEach(m => m.dispose());
  }
}
