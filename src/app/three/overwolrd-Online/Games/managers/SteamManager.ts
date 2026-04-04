// three/Games/managers/SteamManager.ts

import * as THREE from 'three';
import { SteamService } from '../services/SteamService.service';
import { SteamBillboard } from '../objects/SteamBillboard';

export class SteamManager {

  private service = new SteamService();
  private billboard: SteamBillboard;

  private updateInterval?: number;
  private rotationInterval?: number; // 🔥 Nuevo intervalo para rotar imágenes
  private currentIndex = 0;

  private trendingGames: any[] = [];
  
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isHovered = false;
  private label?: HTMLElement;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera
  ) {
    this.billboard = new SteamBillboard(20, 20, 0.6); // 🔥 ICONO MASIVO
    this.createLabel();
    this.setupEvents();
  }

  private createLabel() {
    this.label = document.createElement('div');
    this.label.id = 'steam-hover-label';
    this.label.style.position = 'absolute';
    this.label.style.display = 'none';
    this.label.style.padding = '14px';
    this.label.style.background = 'rgba(10, 15, 23, 0.95)'; // Más oscuro y premium
    this.label.style.color = 'white';
    this.label.style.borderRadius = '12px';
    this.label.style.border = '2px solid #4444ff';
    this.label.style.pointerEvents = 'none';
    this.label.style.zIndex = '1000';
    this.label.style.fontFamily = 'Inter, Segoe UI, sans-serif';
    this.label.style.boxShadow = '0 8px 32px rgba(0,0,0,0.8), 0 0 15px rgba(68, 68, 255, 0.4)';
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
    // -------------------------------------------------------------------------
    // 🔧 CONFIGURACIÓN DE POSICIÓN DEL CARTEL (MODIFICA AQUÍ)
    // Parámetros: (X: Izquierda/Derecha, Y: Altura, Z: Profundidad)
    // -------------------------------------------------------------------------
    this.billboard.setPosition(0, 27, -55); 
    // -------------------------------------------------------------------------

    this.scene.add(this.billboard.mesh);

    await this.updateGame();
    this.startRotation();

    this.updateInterval = window.setInterval(() => {
      this.updateGame();
    }, 60000);
  }

  private startRotation() {
    if (this.rotationInterval) clearInterval(this.rotationInterval);
    this.rotationInterval = window.setInterval(() => {
      if (this.trendingGames.length > 0) {
        this.currentIndex = (this.currentIndex + 1) % Math.min(this.trendingGames.length, 3);
        const nextGame = this.trendingGames[this.currentIndex];
        this.billboard.setImage(nextGame.image);
      }
    }, 6000); // Rotar cada 6 segundos
  }

  private async updateGame() {
    try {
      this.trendingGames = await this.service.getTrendingGames();
      
      if (this.trendingGames.length > 0) {
        // Al actualizar datos, mostramos el #1 inmediatamente si es el inicio
        if (this.currentIndex === 0) {
          const topGame = this.trendingGames[0];
          this.billboard.setImage(topGame.image);
        }
        this.updateLabelContent();
      }
    } catch (e) {
      console.error('❌ Steam update error', e);
    }
  }

  private updateLabelContent() {
    if (!this.label) return;
    const top3 = this.trendingGames.slice(0, 3);
    this.label.innerHTML = `
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 10px; color: #66c0f4; letter-spacing: 1px; text-transform: uppercase;">🔥 Trending Now on Steam</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${top3.map((g, i) => `
          <div style="display: flex; align-items: center; gap: 10px; opacity: ${this.currentIndex === i ? '1' : '0.6'}">
            <span style="color: #4444ff; font-weight: bold;">#${i+1}</span>
            <span style="${this.currentIndex === i ? 'text-decoration: underline; color: #fff;' : 'color: #ccc;'}">${g.name}</span>
          </div>
        `).join('')}
      </div>
      <div style="margin-top: 12px; font-size: 10px; color: #888; text-align: right;">Top by Concurrent Players</div>
    `;
  }

  update(dt: number, time: number) {
    this.billboard.lookAt(this.camera);
    this.billboard.update(time); // Pasar tiempo para animación de pulso

    // Raycast para hover
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.billboard.mesh, true);

    if (intersects.length > 0) {
      if (!this.isHovered) {
        this.isHovered = true;
        this.billboard.onHover(true);
        if (this.label) {
          this.label.style.display = 'block';
          this.updateLabelContent(); // Refrescar para resaltar el actual
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
    if (this.label) {
      this.label.remove();
    }
  }
}