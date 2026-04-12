// three/core/RendererManager.ts
import * as THREE from 'three';

export class RendererManager {
  renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement, width: number, height: number) {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
  }
}
