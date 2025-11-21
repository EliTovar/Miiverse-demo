// three/controls/OrbitControlManager.ts
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

export class OrbitControlManager {
  controls: OrbitControls;

  constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
  }

  update() {
    this.controls.update();
  }
}
