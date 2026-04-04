// three/Games/managers/SteamBillboardManager.ts

import * as THREE from 'three';
import { SteamGame, SteamService } from '../services/SteamService.service';
import { SteamBillboard } from '../objects/SteamBillboard';

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

  async init() {
    const p = this.config.position;
    this.billboard.setPosition(p.x, p.y, p.z);
    this.scene.add(this.billboard.mesh);

    await this.updateData();
    this.startRotation();

    this.updateInterval = window.setInterval(() => {
      this.updateData();
    }, 60000);
  }

  private startRotation() {
    if (this.rotationInterval) clearInterval(this.rotationInterval);
    
    // -------------------------------------------------------------------------
    // ⏱️ TIEMPO DE ROTACIÓN (MODIFICA AQUÍ)
    // El valor está en milisegundos (10000 = 10 segundos).
    // -------------------------------------------------------------------------
    const rotationTime = 10000; 
    // -------------------------------------------------------------------------

    this.rotationInterval = window.setInterval(() => {
      if (this.games.length > 0) {
        // Rotar entre todos los juegos disponibles (ahora son 5)
        this.currentIndex = (this.currentIndex + 1) % this.games.length;
        const nextGame = this.games[this.currentIndex];
        this.billboard.setImage(nextGame.image);
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
      }
    } catch (e) {
      console.error(`❌ Billboard Update Error [${this.config.title}]`, e);
    }
  }

  private updateLabelContent() {
    if (!this.label) return;

    // -------------------------------------------------------------------------
    // 📋 LISTA DE JUEGOS EN EL LABEL (MODIFICA AQUÍ)
    // .slice(0, 5) muestra los 5 mejores juegos en el panel flotante.
    // -------------------------------------------------------------------------
    const topGames = this.games.slice(0, 5);
    // -------------------------------------------------------------------------

    this.label.innerHTML = `
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 10px; color: ${this.config.color}; letter-spacing: 1px; text-transform: uppercase;">
        ${this.config.icon} ${this.config.title}
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${topGames.map((g, i) => `
          <div style="display: flex; align-items: center; gap: 10px; opacity: ${this.currentIndex === i ? '1' : '0.6'}">
            <span style="color: ${this.config.color}; font-weight: bold;">#${i+1}</span>
            <span style="${this.currentIndex === i ? 'text-decoration: underline; color: #fff;' : 'color: #ccc;'}">${g.name}</span>
          </div>
        `).join('')}
      </div>
      <div style="margin-top: 12px; font-size: 10px; color: #888; text-align: right;">${this.config.subtitle}</div>
    `;
  }

  update(dt: number, time: number) {
    this.billboard.lookAt(this.camera);
    this.billboard.update(time);

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
  }
}
