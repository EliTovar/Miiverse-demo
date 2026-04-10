// src/three/SceneManager.ts
import * as THREE from 'three';
import { Cube } from './objects/cube';
import { ControlManager } from './ControlManager';
import { LabelManager } from './LabelManager';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cube: Cube;
  controls: ControlManager;
  clock: THREE.Clock;
  labels: LabelManager;

  constructor(container: HTMLElement, enableControls = true) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(
        75,
        width / height,
        0.1,
        1000
    );
    this.camera.position.set(0, 1.5, 4); // centrado en el cubo
    this.camera.lookAt(0, 0, 0); // siempre mirar al centro

    this.renderer = new THREE.WebGLRenderer({ antialias: true, 
        alpha: true // 👈 permite overlay correcto
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // Luz
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(3, 5, 2);
    this.scene.add(light);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Cubo
    this.cube = new Cube();
    this.scene.add(this.cube.mesh);
    this.scene.add(this.cube.thoughts); // 🔥 Sistema de partículas

    // Controles
    this.controls = new ControlManager(this.camera, this.renderer, enableControls);

    // Labels
    this.labels = new LabelManager(this.scene, container);
    this.labels.showLabel(this.cube.mesh, "🧠 NeuroSama inicializando...");

    window.addEventListener('resize', () => this.onWindowResize(container));

    // Reloj
    this.clock = new THREE.Clock();

    // Responsividad
    window.addEventListener('resize', () => this.onWindowResize(container));
  }
  

  onWindowResize(container: HTMLElement) {
  const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

  this.camera.aspect = width / height;
  this.camera.updateProjectionMatrix();

  this.renderer.setSize(width, height);
}


  render() {
    const delta = this.clock.getDelta();
    this.cube.update(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
  
}