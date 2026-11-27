// three/Games/managers/SteamBillboardManager.ts

import * as THREE from 'three';
import { SteamGame, SteamService } from '../services/SteamService.service';
import { SteamBillboard } from '../objects/SteamBillboard';

/**
 * Escapa los caracteres especiales de HTML.
 * Los nombres y autores vienen de APIs externas (Pixiv, Top.gg, Steam, MAL):
 * sin escapar, un título como `<img src=x onerror=...>` ejecutaría código (XSS).
 */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Disco plano con borde gris suave y centro casi transparente. */
function createFloorRing(radius: number): THREE.Mesh {
  const s = 256;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(150, 156, 165, 0.04)');
  grad.addColorStop(0.78, 'rgba(150, 156, 165, 0.07)');
  grad.addColorStop(0.86, 'rgba(120, 126, 135, 0.45)');
  grad.addColorStop(0.93, 'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const ring = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  return ring;
}

export interface BillboardConfig {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  position: { x: number; y: number; z: number };
  size?: { w: number; h: number; r: number };
  fetchMethod: () => Promise<SteamGame[]>;
  /** Texto antes del autor en la etiqueta. Por defecto 'por ' (Discord usa '' porque muestra miembros). */
  authorPrefix?: string;
  /** Texto si la lista llega vacía sin error (p. ej. nadie recibió Yeahs esta semana). */
  emptyMessage?: string;
}

export class SteamBillboardManager {

  private billboard: SteamBillboard;
  /** Círculo en el suelo bajo el icono, como en la plaza de Wii U. */
  private floorRing?: THREE.Mesh;
  private updateInterval?: number;
  private rotationInterval?: number;
  private currentIndex = 0;
  private games: SteamGame[] = [];
  
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isHovered = false;
  private label?: HTMLElement;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private config: BillboardConfig
  ) {
    const s = config.size || { w: 20, h: 20, r: 2.5 };
    this.billboard = new SteamBillboard(s.w, s.h, s.r);
    
    this.createLabel();
    this.setupEvents();
  }

  private createLabel() {
    this.label = document.createElement('div');
    this.label.className = 'steam-billboard-label';
    this.label.style.position = 'absolute';
    this.label.style.display = 'none';
    // Tarjeta blanca como los bocadillos de la plaza de Wii U (tema --mv-* de styles.scss).
    this.label.style.minWidth = '240px';
    this.label.style.maxWidth = '320px';
    this.label.style.padding = '14px 16px';
    this.label.style.background = 'rgba(255, 255, 255, 0.97)';
    this.label.style.color = 'var(--mv-text)';
    this.label.style.borderRadius = '16px';
    this.label.style.border = '1px solid var(--mv-border)';
    this.label.style.borderTop = `4px solid ${this.config.color}`;
    this.label.style.pointerEvents = 'none';
    this.label.style.zIndex = '1000';
    this.label.style.fontFamily = 'var(--mv-font)';
    this.label.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.18)';
    document.body.appendChild(this.label);
  }

  private readonly onMouseMove = (event: MouseEvent) => {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (this.label) {
      this.label.style.left = (event.clientX + 20) + 'px';
      this.label.style.top = (event.clientY + 20) + 'px';
    }
  };

  private setupEvents() {
    window.addEventListener('mousemove', this.onMouseMove);
  }

  private lastMouseX = -1;
  private lastMouseY = -1;

  async init() {
    const p = this.config.position;
    this.billboard.setPosition(p.x, p.y, p.z);
    this.scene.add(this.billboard.mesh);
    this.floorRing = createFloorRing((this.config.size?.w ?? 20) * 0.55);
    this.floorRing.position.set(p.x, 0.03, p.z);
    this.floorRing.renderOrder = -1; // sobre el brillo del suelo y antes que el cristal
    this.scene.add(this.floorRing);

    await this.updateData();
    
    // 🔥 SOLUCIÓN AL LAG (Escalonamiento)
    // En lugar de rotar todos a la vez, esperamos un tiempo aleatorio entre 0 y 8 segundos
    const initialDelay = Math.random() * 8000;
    setTimeout(() => {
      this.startRotation();
    }, initialDelay);

    // Los datos se renuevan cada 1 hora en el backend (caché de cada servicio).
    // Aquí solo preguntamos cada 3 min para mostrar el dato nuevo poco después
    // de que el backend lo renueve; mientras tanto responde desde su caché.
    this.updateInterval = window.setInterval(() => {
      this.updateData();
    }, 180000);
  }

  private startRotation() {
    if (this.rotationInterval) clearInterval(this.rotationInterval);
    
    const rotationTime = 10000; 

    this.rotationInterval = window.setInterval(() => {
      if (this.games.length > 0) {
        this.currentIndex = (this.currentIndex + 1) % this.games.length;
        const nextGame = this.games[this.currentIndex];
        this.billboard.setImage(nextGame.image);
        this.updateLabelContent();
      }
    }, rotationTime);
  }

  private async updateData() {
    try {
      this.games = await this.config.fetchMethod();
      
      if (this.games.length > 0) {
        if (this.currentIndex === 0) {
          const topGame = this.games[0];
          this.billboard.setImage(topGame.image);
        }
        this.updateLabelContent();
      } else if (this.config.emptyMessage) {
        // Lista vacía pero sin error: es un dato válido, no un fallo.
        this.billboard.setErrorMessage(this.config.emptyMessage, this.config.color);
        this.updateLabelContent();
      } else {
        // ⚠️ Si la lista está vacía (error de red o API), mostramos el aviso visual
        this.billboard.setErrorMessage('⚠️ Error de Carga');
      }
    } catch (e) {
      console.error(`❌ Billboard Update Error [${this.config.title}]`, e);
      // ⚠️ También mostramos el error si la petición falló por completo
      this.billboard.setErrorMessage('⚠️ Error de Red');
      this.updateLabelContent();
    }
  }

  private updateLabelContent() {
    if (!this.label) return;

    const topGames = this.games.slice(0, 5);
    const currentGame = this.games[this.currentIndex];

    this.label.innerHTML = `
      <div style="font-weight: 800; font-size: 15px; margin-bottom: 8px; color: #333;">
        ${this.config.icon} ${this.config.title}
      </div>
      ${currentGame ? `
        <div style="font-size: 14px; margin-bottom: 12px; padding: 10px 12px; background: #f6f6f6; border-radius: 10px; border-left: 4px solid ${this.config.color};">
           <div style="font-weight: 800; margin-bottom: 2px;">${escapeHtml(currentGame.name)}</div>
           <div style="color: #777; font-size: 12px; font-weight: 700;">${this.config.authorPrefix ?? 'por '}${escapeHtml(currentGame.author || 'Artista Desconocido')}</div>
        </div>
      ` : ''}
      <div style="display: flex; flex-direction: column; gap: 7px;">
        ${topGames.length > 0 ? topGames.map((g, i) => `
          <div style="display: flex; align-items: center; gap: 10px; opacity: ${this.currentIndex === i ? '1' : '0.55'}">
            <span style="flex-shrink: 0; min-width: 26px; padding: 1px 0; border-radius: 999px; background: ${this.currentIndex === i ? this.config.color : '#e9e9e9'}; color: ${this.currentIndex === i ? '#fff' : '#555'}; font-weight: 800; font-size: 11px; text-align: center;">${i + 1}</span>
            <div style="display: flex; flex-direction: column; min-width: 0;">
                <span style="font-size: 12px; font-weight: 800; color: #333;">${escapeHtml(g.name)}</span>
                <span style="font-size: 11px; font-weight: 600; color: #888;">${escapeHtml(g.author || '')}</span>
            </div>
          </div>
        `).join('') : `
          <div style="color: #888; font-size: 12px; font-weight: 700; padding: 10px; text-align: center;">
            ${this.config.emptyMessage ? escapeHtml(this.config.emptyMessage) : 'No se pudieron cargar los datos.<br>Verifica tu conexión.'}
          </div>
        `}
      </div>
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #ececec; font-size: 11px; font-weight: 700; color: #999; text-align: right;">${this.config.subtitle}</div>
    `;
  }

  private isOccluded = false;
  private currentOpacity = 1.0;

  setOccluded(val: boolean) {
    this.isOccluded = val;
  }

  update(dt: number, time: number) {
    this.billboard.lookAt(this.camera);

    // ⚡ INTERPOLACIÓN DE OPACIDAD (X-Ray Effect)
    // Si está ocluido, bajar a 0.3. Si no, volver a 1.0.
    const targetOpacity = this.isOccluded ? 0.3 : 1.0;
    this.currentOpacity = THREE.MathUtils.lerp(this.currentOpacity, targetOpacity, 0.1);
    this.billboard.setOpacity(this.currentOpacity);

    this.billboard.update(time);

    // ⚡ OPTIMIZACIÓN: Solo lanzar rayos si el mouse se ha movido
    if (this.mouse.x === this.lastMouseX && this.mouse.y === this.lastMouseY) {
       // Mantener el estado actual (si estaba hovered, sigue hovered)
       return;
    }
    
    this.lastMouseX = this.mouse.x;
    this.lastMouseY = this.mouse.y;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.billboard.mesh, true);

    if (intersects.length > 0) {
      if (!this.isHovered) {
        this.isHovered = true;
        this.billboard.onHover(true);
        if (this.label) {
          this.label.style.display = 'block';
          this.updateLabelContent();
        }
      }
    } else {
      if (this.isHovered) {
        this.isHovered = false;
        this.billboard.onHover(false);
        if (this.label) this.label.style.display = 'none';
      }
    }
  }

  /** Malla 3D del cartel (para calcular si tapa a un jugador). */
  get mesh(): THREE.Object3D {
    return this.billboard.mesh;
  }

  dispose() {
    window.removeEventListener('mousemove', this.onMouseMove);
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.rotationInterval) clearInterval(this.rotationInterval);
    if (this.label) this.label.remove();
    this.billboard.dispose();
    if (this.floorRing) {
      this.scene.remove(this.floorRing);
      this.floorRing.geometry.dispose();
      const mat = this.floorRing.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
  }
}
