// three/core/SceneManager.ts
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Color del horizonte: la niebla y la parte baja del cielo lo comparten para que el suelo se funda con él. */
export const HORIZON_COLOR = 0xeef0f3;

/**
 * Escena con el aspecto de la plaza de Wii U: cielo blanco brumoso y niebla
 * clara que hace desaparecer el suelo a lo lejos.
 */
export class SceneManager {
  scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = this.createSkyTexture();
    this.scene.fog = new THREE.Fog(HORIZON_COLOR, 70, 175);
  }

  /**
   * Reflejos suaves para los materiales "de cristal" de los carteles.
   * Necesita el renderer, por eso no va en el constructor.
   */
  setupEnvironment(renderer: THREE.WebGLRenderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 0.35;
    room.dispose();
    pmrem.dispose();
  }

  add(object: THREE.Object3D) {
    this.scene.add(object);
  }

  dispose() {
    (this.scene.background as THREE.Texture | null)?.dispose();
    this.scene.environment?.dispose();
  }

  /** Degradado vertical de casi blanco (arriba) al color del horizonte (abajo). */
  private createSkyTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#fbfcfd');
    grad.addColorStop(0.45, '#f3f5f8');
    grad.addColorStop(1, '#' + HORIZON_COLOR.toString(16));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
