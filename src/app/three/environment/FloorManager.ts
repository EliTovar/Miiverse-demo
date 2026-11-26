// three/environment/FloorManager.ts
import * as THREE from 'three';

/** Tamaño (en unidades del mundo) de cada rombo de la malla del suelo. */
const CELL_SIZE = 1.6;

/**
 * Suelo de la plaza de Wii U: malla fina de rombos blancos acolchados con
 * bordes grises, algo brillante y con manchas de luz suaves.
 * `size` es solo visual: la zona por la que se camina la limita CharacterController.
 */
export class FloorManager {
  floor: THREE.Mesh;
  private glow: THREE.Mesh;
  private textures: THREE.Texture[] = [];

  constructor(scene: THREE.Scene, size = 50) {
    const lattice = this.createLatticeTexture();
    lattice.wrapS = THREE.RepeatWrapping;
    lattice.wrapT = THREE.RepeatWrapping;
    lattice.repeat.set(size / CELL_SIZE, size / CELL_SIZE);
    lattice.anisotropy = 16;
    this.textures.push(lattice);

    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({ map: lattice, roughness: 0.25, metalness: 0 }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    scene.add(this.floor);

    // Manchas de luz blanca sobre el suelo (el brillo de las capturas).
    const glowTexture = this.createGlowTexture();
    this.textures.push(glowTexture);
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 260),
      new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false }),
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.set(0, 0.02, 0);
    this.glow.renderOrder = -2; // antes que los iconos de cristal (que no escriben profundidad)
    scene.add(this.glow);
  }

  dispose() {
    this.textures.forEach(t => t.dispose());
    for (const mesh of [this.floor, this.glow]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }

  /**
   * Un rombo en el centro y cuartos de rombo en las esquinas: al repetirse
   * forman la malla. Cada rombo tiene un degradado radial para parecer acolchado.
   */
  private createLatticeTexture(): THREE.Texture {
    const s = 128;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d')!;

    // Fondo = líneas de la malla.
    ctx.fillStyle = '#b9c0c9';
    ctx.fillRect(0, 0, s, s);

    const r = s / 2 - 4;
    for (const [cx, cy] of [[s / 2, s / 2], [0, 0], [s, 0], [0, s], [s, s]]) {
      const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, 0, cx, cy, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.6, '#f4f6f9');
      g.addColorStop(1, '#dfe3e9');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /** Varias manchas blancas difuminadas sobre fondo transparente. */
  private createGlowTexture(): THREE.Texture {
    const s = 512;
    const canvas = document.createElement('canvas');
    canvas.width = s;
    canvas.height = s;
    const ctx = canvas.getContext('2d')!;

    // x, y, radio, intensidad (en fracciones del canvas)
    const spots: [number, number, number, number][] = [
      [0.5, 0.45, 0.32, 0.6],
      [0.25, 0.3, 0.2, 0.4],
      [0.78, 0.6, 0.22, 0.4],
      [0.62, 0.22, 0.16, 0.3],
    ];
    for (const [x, y, r, a] of spots) {
      const g = ctx.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s);
      g.addColorStop(0, `rgba(255, 255, 255, ${a})`);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
