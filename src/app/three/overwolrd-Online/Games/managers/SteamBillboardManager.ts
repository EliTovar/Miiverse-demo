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

export interface BillboardConfig {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  position: { x: number; y: number; z: number };
  size?: { w: number; h: number; r: number };
  fetchMethod: () => Promise<SteamGame[]>;
}

export class SteamBillboardManager {

  private billboard: SteamBillboard;
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
    this.label.style.padding = '14px';
    this.label.style.background = 'rgba(10, 15, 23, 0.95)';
    this.label.style.color = 'white';
    this.label.style.borderRadius = '12px';
    this.label.style.border = `2px solid ${this.config.color}`;
    this.label.style.pointerEvents = 'none';
    this.label.style.zIndex = '1000';
    this.label.style.fontFamily = 'Inter, Segoe UI, sans-serif';
    this.label.style.boxShadow = `0 8px 32px rgba(0,0,0,0.8), 0 0 15px ${this.config.color}66`;
    this.label.style.backdropFilter = 'blur(4px)';
    document.body.appendChild(this.label);
  }

  private setupEvents() {
    window.addEventListener('mousemove', (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      if (this.label) {
        this.label.style.left = (event.clientX + 20) + 'px';
        this.label.style.top = (event.clientY + 20) + 'px';
      }
    });
  }

  private lastMouseX = -1;
  private lastMouseY = -1;

  async init() {
    const p = this.config.position;
    this.billboard.setPosition(p.x, p.y, p.z);
    this.scene.add(this.billboard.mesh);

    await this.updateData();
    
    // 🔥 SOLUCIÓN AL LAG (Escalonamiento)
    // En lugar de rotar todos a la vez, esperamos un tiempo aleatorio entre 0 y 8 segundos
    const initialDelay = Math.random() * 8000;
    setTimeout(() => {
      this.startRotation();
    }, initialDelay);

    // Actualizar datos cada 3 minutos (180s) para mostrar actualizaciones más rápido.
    // El backend ya tiene caché, por lo que esto es muy ligero.
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
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px; color: ${this.config.color}; letter-spacing: 1px; text-transform: uppercase;">
        ${this.config.icon} ${this.config.title}
      </div>
      ${currentGame ? `
        <div style="font-size: 13px; color: #fff; margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.07); border-radius: 6px; border-left: 3px solid ${this.config.color};">
           <div style="font-weight: bold; margin-bottom: 2px;">${escapeHtml(currentGame.name)}</div>
           <div style="color: ${this.config.color}; opacity: 0.8; font-size: 11px; font-style: italic;">por ${escapeHtml(currentGame.author || 'Artista Desconocido')}</div>
        </div>
      ` : ''}
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${topGames.length > 0 ? topGames.map((g, i) => `
          <div style="display: flex; align-items: center; gap: 10px; opacity: ${this.currentIndex === i ? '1' : '0.4'}">
            <span style="color: ${this.config.color}; font-weight: bold; font-size: 10px;">#${i+1}</span>
            <div style="display: flex; flex-direction: column;">
                <span style="font-size: 11px; font-weight: 500; ${this.currentIndex === i ? 'color: #fff;' : 'color: #aaa;'}">${escapeHtml(g.name)}</span>
                <span style="font-size: 9px; color: #666;">${escapeHtml(g.author || '')}</span>
            </div>
          </div>
        `).join('') : `
          <div style="color: #666; font-size: 11px; font-style: italic; padding: 10px; text-align: center;">
            No se pudieron cargar los datos.<br>Verifica tu conexión.
          </div>
        `}
      </div>
      <div style="margin-top: 15px; font-size: 10px; color: #555; text-align: right; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">${this.config.subtitle}</div>
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

  dispose() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.rotationInterval) clearInterval(this.rotationInterval);
    if (this.label) this.label.remove();
    this.billboard.dispose();
  }
}
