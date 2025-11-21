// three/lighting/LightsManager.ts
import * as THREE from 'three';

export class LightsManager {
  constructor(scene: THREE.Scene) {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 10, 7);

    scene.add(ambient);
    scene.add(directional);
  }
}
