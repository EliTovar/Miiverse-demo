// three/lighting/LightsManager.ts
import * as THREE from 'three';

/** Luz clara y uniforme, como la plaza de Wii U: cielo blanco y rebote suave del suelo. */
export class LightsManager {
  constructor(scene: THREE.Scene) {
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0xdfe4ea, 1.0);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(10, 30, 20);

    scene.add(hemisphere);
    scene.add(directional);
  }
}
