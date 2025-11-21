// three/core/CameraManager.ts
import * as THREE from 'three';

export class CameraManager {
  camera: THREE.PerspectiveCamera;

  constructor(width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(3, 2, 5);
  }
}
