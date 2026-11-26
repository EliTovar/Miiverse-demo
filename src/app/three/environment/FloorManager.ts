// three/environment/FloorManager.ts
import * as THREE from 'three';

/** Tamaño (en unidades del mundo) de cada rombo de la rejilla del suelo. */
const CELL_SIZE = 2.4;

/**
 * Suelo blanco y brillante con una rejilla de rombos, como la plaza de Wii U.
 * `size` es solo visual: la zona por la que se camina la limita CharacterController.
 */
export class FloorManager {
  floor: THREE.Mesh;
  private texture: THREE.Texture;

  constructor(scene: THREE.Scene, size = 50) {
    this.texture = this.createLatticeTexture();
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.repeat.set(size / CELL_SIZE, size / CELL_SIZE);
    this.texture.anisotropy = 8;

    const material = new THREE.MeshStandardMaterial({
      map: this.texture,
      roughness: 0.35,
      metalness: 0,
    });

    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    this.floor.rotation.x = -Math.PI / 2;
    scene.add(this.floor);
  }

  dispose() {
    this.texture.dispose();
    this.floor.geometry.dispose();
    (this.floor.material as THREE.Material).dispose();
  }

  /** Una celda con un rombo de bordes redondeados; al repetirse forma la malla. */
  private createLatticeTexture(): THREE.Texture {
    const s = 128;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d')!;

    // Fondo: las líneas de la malla (gris claro).
    ctx.fillStyle = '#c6cad1';
    ctx.fillRect(0, 0, s, s);

    // Rombo blanco en el centro y cuartos de rombo en las esquinas (encajan al repetir).
    const drawDiamond = (cx: number, cy: number) => {
      const r = s / 2 - 7;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#eceef2');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    for (const [cx, cy] of [[s / 2, s / 2], [0, 0], [s, 0], [0, s], [s, s]]) {
      drawDiamond(cx, cy);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
