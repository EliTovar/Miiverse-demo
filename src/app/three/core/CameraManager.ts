// three/core/CameraManager.ts
import * as THREE from 'three';

export class CameraManager {
  camera: THREE.PerspectiveCamera;

  constructor(width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);

    // -------------------------------------------------------------------------
    // 🔧 POSICIÓN INICIAL DE LA CÁMARA (MODIFICA AQUÍ)
    // Parámetros: (X, Y, Z) - Determina dónde empieza la cámara al cargar.
    // -------------------------------------------------------------------------
    // Plaza de Wii U: cámara lejana y alta con un ángulo de visión estrecho (40°),
    // así los iconos de delante y de atrás se ven de tamaño parecido.
    this.camera.position.set(0, 86, 122);
    // -------------------------------------------------------------------------
  }
}
