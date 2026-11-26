// three/controls/OrbitControlManager.ts
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

export class OrbitControlManager {
  controls: OrbitControls;

  constructor(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    
    // 🔧 CONFIGURACIÓN DEL ZOOM MÁXIMO (MODIFICA AQUÍ)
    // Este número controla qué tan lejos se puede alejar la cámara.
    this.controls.maxDistance = 160; // la vista inicial está a ~135
  }

  update() {
    this.controls.update();
  }
}
