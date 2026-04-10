// src/three/ControlManager.ts
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

export class ControlManager {
  controls?: OrbitControls;
  enabled: boolean;

  constructor(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, renderer: THREE.WebGLRenderer, enableControls: boolean) {
    this.enabled = enableControls;

    //Solo crear los OrbitControls si están habilitados
    if (this.enabled) {
      this.controls = new OrbitControls(camera, renderer.domElement);
      this.controls.enableDamping = true; //moviemiento suave
      this.controls.dampingFactor = 0.05;
    }
  }

  update() {
    if (this.enabled && this.controls) {
        this.controls.enableRotate = false;
        this.controls.enableZoom = false;
        this.controls.enablePan = false;
    }
  }
}
