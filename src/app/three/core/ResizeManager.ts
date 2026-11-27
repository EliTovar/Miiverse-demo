// three/core/ResizeManager.ts
import * as THREE from 'three';

export class ResizeManager {
  private readonly onResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  constructor(
    private readonly container: HTMLElement,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly renderer: THREE.WebGLRenderer
  ) {
    window.addEventListener('resize', this.onResize);
  }

  /** Quita el listener de `window` (si no, se acumula uno por cada visita a la plaza). */
  dispose() {
    window.removeEventListener('resize', this.onResize);
  }
}
