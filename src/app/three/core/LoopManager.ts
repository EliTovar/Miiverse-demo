// three/core/LoopManager.ts
import * as THREE from 'three';

export class LoopManager {
  private updateCallbacks: (() => void)[] = [];
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  addUpdateCallback(callback: () => void) {
    this.updateCallbacks.push(callback);
  }

  start() {
    const animate = () => {
      requestAnimationFrame(animate);
      this.updateCallbacks.forEach(cb => cb());
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }
}
