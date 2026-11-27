import * as THREE from 'three';
import { loadCharacter } from '../../../three/online/loaders/character-loader';
import { MiiAppearance } from '../../../three/online/loaders/mii-appearance';

/**
 * Mini escena 3D con un Mii girando despacio. La usa el menú de personalización.
 * Cada cambio vuelve a armar el Mii (las piezas ya están en caché, así que es rápido).
 */
export class MiiPreview {
  private renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  private clock = new THREE.Clock();
  private mixer?: THREE.AnimationMixer;
  private model?: THREE.Object3D;
  private frame = 0;
  private request = 0; // para ignorar armados viejos si el usuario cambia rápido
  private resizeObserver: ResizeObserver;

  constructor(private host: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(3, 6, 8);
    this.scene.add(sun);

    this.camera.position.set(0, 6, 34);
    this.camera.lookAt(0, 5, 0);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.loop();
  }

  async show(appearance: MiiAppearance) {
    const id = ++this.request;
    const { model, animations } = await loadCharacter(appearance);
    if (id !== this.request || !this.renderer) return; // llegó otro cambio mientras cargaba

    if (this.model) this.scene.remove(this.model);
    model.rotation.y = this.model?.rotation.y ?? 0;
    this.model = model;
    this.scene.add(model);

    this.mixer = new THREE.AnimationMixer(model);
    const idle = animations.find((clip) => clip.name === 'idle');
    if (idle) this.mixer.clipAction(idle).play();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private resize() {
    const { clientWidth: width, clientHeight: height } = this.host;
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.frame = requestAnimationFrame(this.loop);
    const delta = this.clock.getDelta();
    this.mixer?.update(delta);
    if (this.model) this.model.rotation.y += delta * 0.4;
    this.renderer.render(this.scene, this.camera);
  };
}
