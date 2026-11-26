// three/environment/FloorManager.ts
import * as THREE from 'three';

/** Ancho (en unidades del mundo) de cada celda hexagonal de la malla del suelo. */
const CELL_WIDTH = 2.8;

/** Tamaño del canvas de la textura: ancho y alto de un tramo que se repite sin cortes. */
const TILE_W = 128;
const TILE_H = Math.round((TILE_W * 3) / Math.sqrt(3)); // hexágonos regulares

/**
 * Suelo de la plaza de Wii U: malla de hexágonos blancos con bordes gris
 * azulado, algo brillante y con manchas de luz suaves.
 * `size` es solo visual: la zona por la que se camina la limita CharacterController.
 */
export class FloorManager {
  floor: THREE.Mesh;
  private glow: THREE.Mesh;
  private textures: THREE.Texture[] = [];

  constructor(scene: THREE.Scene, size = 50) {
    const lattice = this.createHexTexture();
    lattice.wrapS = THREE.RepeatWrapping;
    lattice.wrapT = THREE.RepeatWrapping;
    const cellHeight = CELL_WIDTH * (TILE_H / TILE_W);
    lattice.repeat.set(size / CELL_WIDTH, size / cellHeight);
    lattice.anisotropy = 8;
    this.textures.push(lattice);

    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({ map: lattice, roughness: 0.22, metalness: 0 }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    scene.add(this.floor);

    // Manchas de luz blanca sobre el suelo (el brillo que se ve en las capturas).
    const glowTexture = this.createGlowTexture();
    this.textures.push(glowTexture);
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      new THREE.MeshBasicMaterial({
        map: glowTexture,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.set(0, 0.02, -20);
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
   * Tramo con hexágonos "de punta arriba": filas en y = 0, H/2 y H, la del
   * medio desplazada medio hexágono. Al repetirse encaja sin cortes.
   */
  private createHexTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = TILE_W;
    canvas.height = TILE_H;
    const ctx = canvas.getContext('2d')!;

    // Fondo = color de los bordes de la malla.
    ctx.fillStyle = '#c2c9d2';
    ctx.fillRect(0, 0, TILE_W, TILE_H);

    const radius = TILE_H / 3; // radio de un hexágono regular de ancho TILE_W
    const inner = radius - 5;  // hueco entre celdas = grosor del borde

    const grad = ctx.createLinearGradient(0, 0, 0, TILE_H);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#f3f5f8');
    grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#f7f8fa';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';

    const centers = [
      [0, 0], [TILE_W, 0],
      [TILE_W / 2, TILE_H / 2],
      [0, TILE_H], [TILE_W, TILE_H],
    ];
    for (const [cx, cy] of centers) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 6 + (i * Math.PI) / 3; // vértice arriba y abajo
        const x = cx + inner * Math.cos(angle);
        const y = cy + inner * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
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

    const spots: [number, number, number, number][] = [
      // x, y, radio, intensidad (fracciones del canvas)
      [0.5, 0.42, 0.34, 0.55],
      [0.22, 0.3, 0.2, 0.35],
      [0.8, 0.62, 0.22, 0.35],
      [0.35, 0.75, 0.18, 0.25],
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
