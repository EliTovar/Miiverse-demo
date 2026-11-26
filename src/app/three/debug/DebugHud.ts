// three/debug/DebugHud.ts
import * as THREE from 'three';

const HUD_ID = 'camera-debug-hud';

/**
 * Panel flotante de depuración: posición y objetivo de la cámara + FPS.
 * Se puede arrastrar con el ratón. `dispose()` lo quita de la página y
 * elimina los listeners de `window`.
 */
export class DebugHud {
  private readonly element: HTMLDivElement;
  private isDragging = false;
  private offsetX = 0;
  private offsetY = 0;

  private fps = 0;
  private frameCount = 0;
  private lastTime = performance.now();

  constructor(
    private readonly camera: THREE.Camera,
    private readonly target: THREE.Vector3,
  ) {
    // Si ya existe (ej: por re-render), lo eliminamos para no duplicarlo
    document.getElementById(HUD_ID)?.remove();

    this.element = document.createElement('div');
    this.element.id = HUD_ID;
    Object.assign(this.element.style, {
      position: 'absolute',
      top: '70px', // debajo de la barra superior
      left: '10px',
      padding: '12px',
      background: 'rgba(10, 15, 23, 0.9)',
      color: '#00ff88',
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      borderRadius: '8px',
      border: '1px solid rgba(0, 255, 136, 0.3)',
      pointerEvents: 'auto',
      cursor: 'grab',
      zIndex: '10000',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
    });
    document.body.appendChild(this.element);

    this.element.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  /** Llamar en cada frame. */
  update(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
    }

    const pos = this.camera.position;
    const target = this.target;
    this.element.innerHTML = `
        <div style="color: #ffaa00; font-weight: bold; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span>🎥 CAMERA DEBUG</span>
          <span style="background: rgba(0,255,136,0.1); color: #00ff88; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${this.fps} FPS</span>
        </div>
        <div style="opacity: 0.8;">
          <span style="color: #66c0f4;">POS:</span> ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}<br>
          <span style="color: #66c0f4;">TGT:</span> ${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}
        </div>
      `;
  }

  dispose(): void {
    this.element.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.element.remove();
  }

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.offsetX = e.clientX - this.element.offsetLeft;
    this.offsetY = e.clientY - this.element.offsetTop;
    this.element.style.cursor = 'grabbing';
    this.element.style.borderColor = 'rgba(0, 255, 136, 0.8)';
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return;
    this.element.style.left = e.clientX - this.offsetX + 'px';
    this.element.style.top = e.clientY - this.offsetY + 'px';
  };

  private onMouseUp = () => {
    this.isDragging = false;
    this.element.style.cursor = 'grab';
    this.element.style.borderColor = 'rgba(0, 255, 136, 0.3)';
  };
}
