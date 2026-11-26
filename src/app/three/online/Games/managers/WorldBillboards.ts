// three/online/Games/managers/WorldBillboards.ts
import * as THREE from 'three';

import { BillboardConfig, SteamBillboardManager } from './SteamBillboardManager';
import { SteamService } from '../services/SteamService.service';
import { DiscordService } from '../services/DiscordService.service';
import { SpotifyService } from '../services/SpotifyService.service';
import { AnimeService } from '../services/AnimeService.service';
import { MangaService } from '../services/MangaService.service';
import { PixivService } from '../services/PixivService.service';
import { TopPlayersService } from '../services/TopPlayersService.service';

/**
 * Los 8 carteles del mundo 3D: qué muestran y dónde están.
 * x: Izquierda(-) / Derecha(+)  |  y: Altura  |  z: Profundidad
 */
function billboardConfigs(): BillboardConfig[] {
  const steamService = new SteamService();
  const discordService = new DiscordService();
  const spotifyService = new SpotifyService();
  const animeService = new AnimeService();
  const mangaService = new MangaService();
  const pixivService = new PixivService();
  const topPlayersService = new TopPlayersService();

  return [
    // 1. Cartel de Tendencias (Trending) - Izquierda
    {
      title: 'Trending Now',
      subtitle: 'Top by Concurrent Players',
      icon: '🔥',
      color: '#66c0f4',
      position: { x: -15.0, y: 16.27, z: -40 },
      size: { w: 16.4, h: 16.4, r: 2.0 },
      fetchMethod: () => steamService.getTrendingGames(),
    },
    // 2. Cartel de Novedades (Recent) - Derecha
    {
      title: 'New Releases',
      subtitle: 'Latest on Steam Store',
      icon: '✨',
      color: '#00ff88',
      position: { x: 15.0, y: 16.27, z: -40 },
      size: { w: 16.4, h: 16.4, r: 2.0 },
      fetchMethod: () => steamService.getRecentGames(),
    },
    // 3. Top Discord Servers
    {
      title: 'Top Discord Servers',
      subtitle: 'Most Members on Discord',
      authorPrefix: '',
      icon: '🚪',
      color: '#7289da', // Color Discord Blurple
      position: { x: -40, y: 16.27, z: -20 },
      size: { w: 16.4, h: 16.4, r: 2.0 },
      fetchMethod: async () => {
        const bots = await discordService.getTopBots();
        // Mapear a la interfaz SteamGame para compatibilidad con el billboard
        return bots.map((bot) => ({
          appid: parseInt(bot.id) || 0,
          name: bot.name,
          author: bot.description, // "4.3M miembros · 409K en línea"
          image: bot.image, // Icono del servidor (CDN de Discord)
        }));
      },
    },
    // 4. Spotify Top 5
    {
      title: 'Spotify Top 5',
      subtitle: 'Global Daily Charts',
      icon: '🎵',
      color: '#1DB954', // Spotify Green
      position: { x: 15.0, y: 16.27, z: 40 },
      size: { w: 18, h: 18, r: 2.5 },
      fetchMethod: () => spotifyService.getTopSongs(),
    },
    // 5. Anime (AniList)
    {
      title: 'Top Anime',
      subtitle: 'Trending now on AniList',
      icon: '📺',
      color: '#ffc107',
      position: { x: -40, y: 16.27, z: 20 },
      size: { w: 16.4, h: 16.4, r: 2.0 },
      fetchMethod: () => animeService.getTopAnime(),
    },
    // 6. Manga (AniList)
    {
      title: 'Top Manga',
      subtitle: 'Trending now on AniList',
      icon: '📚',
      color: '#9c27b0',
      position: { x: 40, y: 16.27, z: -20 },
      size: { w: 16.4, h: 16.4, r: 2.0 },
      fetchMethod: () => mangaService.getTopManga(),
    },
    // 7. Pixiv
    {
      title: 'Pixiv Daily',
      subtitle: 'Top Daily Illustrations',
      icon: '🎨',
      color: '#0096fa',
      position: { x: 40, y: 16.27, z: 20 },
      size: { w: 16.4, h: 16.4, r: 2.0 },
      fetchMethod: () => pixivService.getDailyRanking(),
    },
    // 8. Top 5 Players: usuarios con más Yeahs recibidos esta semana
    {
      title: 'Top 5 Players',
      subtitle: 'Most Yeahs this week (Mon–Sun)',
      authorPrefix: '',
      emptyMessage: 'Aún sin Yeahs',
      icon: '👑',
      color: '#ff4444',
      position: { x: -15.0, y: 16.27, z: 40 }, // En el muro frontal/centro
      size: { w: 20, h: 20, r: 2.5 },
      fetchMethod: () => topPlayersService.getWeeklyTopPlayers(),
    },
  ];
}

/**
 * Crea, actualiza y libera todos los carteles del mundo. También detecta qué
 * carteles tapan a un jugador para volverlos semitransparentes.
 */
export class WorldBillboards {
  private readonly managers: SteamBillboardManager[];
  private readonly occlusionRaycaster = new THREE.Raycaster();

  constructor(
    scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    this.managers = billboardConfigs().map(
      (config) => new SteamBillboardManager(scene, camera, config),
    );
  }

  /** Carga los datos de todos los carteles. */
  init(): Promise<void[]> {
    return Promise.all(this.managers.map((m) => m.init()));
  }

  /** Llamar en cada frame. `players` son las mallas de los jugadores visibles. */
  update(dt: number, time: number, players: THREE.Object3D[]): void {
    this.updateOcclusion(players);
    this.managers.forEach((m) => m.update(dt, time));
  }

  dispose(): void {
    this.managers.forEach((m) => m.dispose());
  }

  private updateOcclusion(players: THREE.Object3D[]): void {
    // 1. Resetear estados de oclusión al inicio del frame
    this.managers.forEach((m) => m.setOccluded(false));

    const camPos = this.camera.position;
    const billMeshes = this.managers.map((m) => m.mesh);

    // 2. Detectar oclusión para cada jugador
    players.forEach((player) => {
      const direction = player.position.clone().sub(camPos).normalize();
      const distanceToPlayer = player.position.distanceTo(camPos);

      this.occlusionRaycaster.set(camPos, direction);
      const intersects = this.occlusionRaycaster.intersectObjects(billMeshes, true);

      for (const intersect of intersects) {
        // Si el objeto está más cerca que el jugador, lo marcamos como oclusor
        if (intersect.distance < distanceToPlayer - 1) {
          this.managers.forEach((m) => {
            if (m.mesh === intersect.object || m.mesh.children.includes(intersect.object)) {
              m.setOccluded(true);
            }
          });
        }
      }
    });
  }
}
