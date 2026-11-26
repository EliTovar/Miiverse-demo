// three/core/CameraManager.ts
import * as THREE from 'three';

export class CameraManager {
  camera: THREE.PerspectiveCamera;

  constructor(width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    // -------------------------------------------------------------------------
    // 🔧 POSICIÓN INICIAL DE LA CÁMARA (MODIFICA AQUÍ)
    // Parámetros: (X, Y, Z) - Determina dónde empieza la cámara al cargar.
    // -------------------------------------------------------------------------
    this.camera.position.set(0, 50, 40); // vista alta y en picado, como la plaza de Wii U
    // -------------------------------------------------------------------------
  }
}
