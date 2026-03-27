// three/core/LoopManager.ts
import * as THREE from 'three';

export type UpdateCallback = (dt: number, time: number) => void;

export class LoopManager {
  private running = false;
  private callbacks: Array<(dt: number, time: number) => void> = [];
  private lastTime = 0;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.Camera
  ) {}

  addUpdateCallback(cb: (dt: number, time: number) => void) {
    this.callbacks.push(cb);
    return () => {
      this.callbacks = this.callbacks.filter(c => c !== cb);
    };
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    console.log('🛑 Loop detenido');
    this.running = false;
    this.callbacks = [];
  }

  private loop = () => {
    if (!this.running) return;

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.callbacks.forEach(cb => cb(dt, now));
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(this.loop);
  };
}

