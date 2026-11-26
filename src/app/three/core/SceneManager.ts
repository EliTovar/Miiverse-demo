// three/core/SceneManager.ts
import * as THREE from 'three';

export class SceneManager {
  scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x222222);
  }

  add(object: THREE.Object3D) {
    this.scene.add(object);
  }
}
