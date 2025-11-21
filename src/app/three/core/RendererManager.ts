// three/core/RendererManager.ts
import * as THREE from 'three';

export class RendererManager {
  renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement, width: number, height: number) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);
  }
}
