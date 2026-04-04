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

    // -------------------------------------------------------------------------
    // 🔧 LÍMITES DE ALTURA DE LA CÁMARA (MODIFICA AQUÍ)
    // Esto evita que la cámara atraviese el suelo o vuele demasiado lejos.
    // -------------------------------------------------------------------------
    if (pos.y < 2) pos.y = 2;    // Altura mínima (suelo)
    if (pos.y > 100) pos.y = 100; // Altura máxima (antes era 20)
    // -------------------------------------------------------------------------
  }
}
