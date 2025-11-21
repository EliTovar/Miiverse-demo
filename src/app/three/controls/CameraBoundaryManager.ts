// three/controls/CameraBoundaryManager.ts
import * as THREE from 'three';

export class CameraBoundaryManager {

  constructor(
    private camera: THREE.Camera,
    private size: number
  ) {}

  update() {
    const half = this.size / 2;

    const pos = this.camera.position;

    // Limitar X, Z dentro del piso
    pos.x = Math.max(-half, Math.min(half, pos.x));
    pos.z = Math.max(-half, Math.min(half, pos.z));

    // Limitar altura de la cámara
    if (pos.y < 2) pos.y = 2;   // no bajar al piso
    if (pos.y > 20) pos.y = 20; // no volar demasiado alto
  }
}
