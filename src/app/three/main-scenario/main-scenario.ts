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
import { SpotifyService } from '../overwolrd-Online/Games/services/SpotifyService.service';
import { AnimeService } from '../overwolrd-Online/Games/services/AnimeService.service';
import { MangaService } from '../overwolrd-Online/Games/services/MangaService.service';
import { PixivService } from '../overwolrd-Online/Games/services/PixivService.service';

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
    // 🛠️ DEBUG HUD (Coordenadas en pantalla + FPS + Draggable)
    // -------------------------------------------------------------------------
    const HUD_ID = 'camera-debug-hud';
    let debugHud = document.getElementById(HUD_ID) as HTMLDivElement;
    
    // 🔥 SOLUCIÓN A DUPLICADOS: Si ya existe (ej: por re-render), lo eliminamos
    if (debugHud) {
      debugHud.remove();
    }

    debugHud = document.createElement('div');
    debugHud.id = HUD_ID;
    debugHud.style.position = 'absolute';
    debugHud.style.top = '10px';
    debugHud.style.left = '10px';
    debugHud.style.padding = '12px';
    debugHud.style.background = 'rgba(10, 15, 23, 0.9)';
    debugHud.style.color = '#00ff88';
    debugHud.style.fontFamily = 'JetBrains Mono, monospace';
    debugHud.style.fontSize = '12px';
    debugHud.style.borderRadius = '8px';
    debugHud.style.border = '1px solid rgba(0, 255, 136, 0.3)';
    debugHud.style.pointerEvents = 'auto';
    debugHud.style.cursor = 'grab';
    debugHud.style.zIndex = '10000';
    debugHud.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    debugHud.style.backdropFilter = 'blur(4px)';
    document.body.appendChild(debugHud);

    // Lógica para arrastrar (Drag)
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    debugHud.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - debugHud.offsetLeft;
      offsetY = e.clientY - debugHud.offsetTop;
      debugHud.style.cursor = 'grabbing';
      debugHud.style.borderColor = 'rgba(0, 255, 136, 0.8)';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      debugHud.style.left = (e.clientX - offsetX) + 'px';
      debugHud.style.top = (e.clientY - offsetY) + 'px';
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      debugHud.style.cursor = 'grab';
      debugHud.style.borderColor = 'rgba(0, 255, 136, 0.3)';
    });

    let fps = 0;
    let frameCount = 0;
    let lastTime = performance.now();

    this.loopManager.addUpdateCallback((dt, time) => {
      // Cálculo de FPS
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (now - lastTime));
        frameCount = 0;
        lastTime = now;
      }

      const pos = this.cameraManager.camera.position;
      const target = orbitControls.controls.target;
      debugHud.innerHTML = `
        <div style="color: #ffaa00; font-weight: bold; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span>🎥 CAMERA DEBUG</span>
          <span style="background: rgba(0,255,136,0.1); color: #00ff88; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${fps} FPS</span>
        </div>
        <div style="opacity: 0.8;">
          <span style="color: #66c0f4;">POS:</span> ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}<br>
          <span style="color: #66c0f4;">TGT:</span> ${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}
        </div>
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
        position: { x: -15.00, y: 16.27, z: -40 }, 
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
        position: { x: 15.00, y: 16.27, z: -40 }, 
        size: { w: 16.4, h: 16.4, r: 2.0 },
        fetchMethod: () => steamService.getRecentGames()
      }
    );

    /* =========================
       DISCORD CHANNELS (TOP.GG)
    ========================= */
    const discordService = new DiscordService();

    // 3. Cartel de Top Discord Channel - Centro/Atrás
    // -------------------------------------------------------------------------
    // 🎮 POSICIÓN DEL CARTEL DISCORD (MODIFICA AQUÍ)
    // x: Izquierda(-) / Derecha(+)  |  y: Altura  |  z: Profundidad
    // -------------------------------------------------------------------------
    const discordManager = new SteamBillboardManager(
      this.sceneManager.scene,
      this.cameraManager.camera,
      {
        title: 'Top Discord Channels',
        subtitle: 'Most Voted on Top.gg',
        icon: '🚪',
        color: '#7289da', // Color Discord Blurple
        position: { x: -40, y: 16.27, z: -20 },
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

    /* =========================
       SPOTIFY TOP 5
    ========================= */
    const spotifyService = new SpotifyService();
    const spotifyManager = new SteamBillboardManager(
      this.sceneManager.scene,
      this.cameraManager.camera,
      {
        title: 'Spotify Top 5',
        subtitle: 'Global Daily Charts',
        icon: '🎵',
        color: '#1DB954', // Spotify Green
        position: { x: 15.00, y: 16.27, z: 40 }, 
        size: { w: 18, h: 18, r: 2.5 },
        fetchMethod: () => spotifyService.getTopSongs()
      }
    );

    /* =========================
       ANIME & MANGA (MAL)
    ========================= */
    const animeService = new AnimeService();
    const animeManager = new SteamBillboardManager(
      this.sceneManager.scene,
      this.cameraManager.camera,
      {
        title: 'Top Anime',
        subtitle: 'Most Popular on MAL',
        icon: '📺',
        color: '#ffc107',
        position: { x: -40, y: 16.27, z: 20 },
        size: { w: 16.4, h: 16.4, r: 2.0 },
        fetchMethod: () => animeService.getTopAnime()
      }
    );

    const mangaService = new MangaService();
    const mangaManager = new SteamBillboardManager(
      this.sceneManager.scene,
      this.cameraManager.camera,
      {
        title: 'Top Manga',
        subtitle: 'Top Rated on MAL',
        icon: '📚',
        color: '#9c27b0',
        position: { x: 40, y: 16.27, z: -20 },
        size: { w: 16.4, h: 16.4, r: 2.0 },
        fetchMethod: () => mangaService.getTopManga()
      }
    );

    /* =========================
       PIXIV RANKINGS
    ========================= */
    const pixivService = new PixivService();
    const pixivManager = new SteamBillboardManager(
      this.sceneManager.scene,
      this.cameraManager.camera,
      {
        title: 'Pixiv Daily',
        subtitle: 'Top Daily Illustrations',
        icon: '🎨',
        color: '#0096fa',
        position: { x: 40, y: 16.27, z: 20 },
        size: { w: 16.4, h: 16.4, r: 2.0 },
        fetchMethod: () => pixivService.getDailyRanking()
      }
    );

    // -------------------------------------------------------------------------
    // 🏆 TOP 5 PLAYERS (NUEVO)
    // -------------------------------------------------------------------------
    const topPlayersManager = new SteamBillboardManager(
      this.sceneManager.scene,
      this.cameraManager.camera,
      {
        title: 'Top 5 Players',
        subtitle: 'Most Active Users',
        icon: '👑',
        color: '#ff4444', 
        position: { x: -15.00, y: 16.27, z: 40 }, // En el muro frontal/centro
        //position: { x: -15.00, y: 16.27, z: -40 }, 
        size: { w: 20, h: 20, r: 2.5 },
        fetchMethod: async () => [] // Vacío por ahora
      }
    );

    this.steamManagers = [
      trendingManager, 
      recentManager, 
      discordManager, 
      spotifyManager,
      animeManager,
      mangaManager,
      pixivManager,
      topPlayersManager
    ];

    // Inicializar todos
    await Promise.all(this.steamManagers.map(m => m.init()));

    // Añadir al loop de actualización
    const occlusionRaycaster = new THREE.Raycaster();

    this.loopManager.addUpdateCallback((dt, time) => {
      // 1. Resetear estados de oclusión al inicio del frame
      this.steamManagers.forEach(m => m.setOccluded(false));

      // 2. Obtener lista de objetivos (Jugador local + Remotos)
      const targets: THREE.Object3D[] = [];
      if (this.multiplayer?.localPlayer) targets.push(this.multiplayer.localPlayer);
      this.multiplayer?.remotePlayers.forEach(p => targets.push(p.mesh));

      // 3. Detectar oclusión para cada jugador
      const camPos = this.cameraManager.camera.position;
      
      targets.forEach(player => {
        const direction = player.position.clone().sub(camPos).normalize();
        const distanceToPlayer = player.position.distanceTo(camPos);
        
        occlusionRaycaster.set(camPos, direction);
        
        // Intersectamos con todos los billoards
        const billMeshes = this.steamManagers.map(m => (m as any).billboard.mesh);
        const intersects = occlusionRaycaster.intersectObjects(billMeshes, true);

        for (const intersect of intersects) {
          // Si el objeto está más cerca que el jugador, lo marcamos como oclusor
          if (intersect.distance < distanceToPlayer - 1) {
            this.steamManagers.forEach(m => {
              if ((m as any).billboard.mesh === intersect.object || 
                  (m as any).billboard.mesh.children.includes(intersect.object)) {
                m.setOccluded(true);
              }
            });
          }
        }
      });

      // 4. Update de managers
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
