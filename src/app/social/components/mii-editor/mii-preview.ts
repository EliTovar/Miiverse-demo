import * as THREE from 'three';
import { loadCharacter } from '../../../three/online/loaders/character-loader';
import { MiiAppearance } from '../../../three/online/loaders/mii-appearance';

/** Cámara para ver el cuerpo entero o acercarse a la cara. */
const VIEWS = {
  body: { distance: 34, lookAtHead: false },
  face: { distance: 15, lookAtHead: true },
};
const BODY_CENTER = new THREE.Vector3(0, 5, 0);

const FOV = 30;

/** Libera la memoria de la GPU de un Mii que ya no se muestra (sus materiales y la textura de la cara). */
function disposeMii(model: THREE.Object3D) {
  model.traverse((o) => {
    const material = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!material) return;
    if (material.map instanceof THREE.CanvasTexture) material.map.dispose(); // la cara es única por Mii
    material.dispose(); // los materiales se clonan por Mii; las geometrías se comparten y no se tocan
  });
}

/**
 * Mini escena con un Mii. La usa el menú de personalización.
 * - 3D: perspectiva, se balancea un poco y respira (animación idle).
 * - 2D: cámara ortográfica de frente y quieta, como una foto plana.
 * Cada cambio vuelve a armar el Mii (las piezas ya están en caché, así que es rápido).
 */
export class MiiPreview {
  private renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  private scene = new THREE.Scene();
  private perspective = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  private flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  private mode: '2d' | '3d' = '3d';
  private clock = new THREE.Clock();
  private mixer?: THREE.AnimationMixer;
  private model?: THREE.Object3D;
  private frame = 0;
  private request = 0; // para ignorar armados viejos si el usuario cambia rápido
  private resizeObserver: ResizeObserver;
  private view: keyof typeof VIEWS = 'body';
  private target = BODY_CENTER.clone(); // punto al que mira la cámara (se mueve suave)

  constructor(private host: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // El canvas ocupa todo el contenedor sin empujar su tamaño (lo decide el CSS).
    Object.assign(this.renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    host.style.position = 'relative';
    host.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(3, 6, 8);
    this.scene.add(sun);

    this.perspective.position.set(0, 6, 34);
    this.perspective.lookAt(BODY_CENTER);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.loop();
  }

  async show(appearance: MiiAppearance) {
    const id = ++this.request;
    const { model, animations } = await loadCharacter(appearance);
    if (id !== this.request || !this.renderer) return; // llegó otro cambio mientras cargaba

    if (this.model) {
      this.scene.remove(this.model);
      disposeMii(this.model);
    }
    this.model = model;
    this.scene.add(model);

    this.mixer = new THREE.AnimationMixer(model);
    const idle = animations.find((clip) => clip.name === 'idle');
    if (idle) this.mixer.clipAction(idle).play();
  }

  focus(view: keyof typeof VIEWS) {
    this.view = view;
  }

  setMode(mode: '2d' | '3d') {
    this.mode = mode;
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
    this.renderer.setSize(width, height, false);
    this.perspective.aspect = width / height;
    this.perspective.updateProjectionMatrix();
  }

  /** Acerca o aleja la cámara poco a poco hacia la vista elegida. */
  private moveCamera(delta: number) {
    const { distance, lookAtHead } = VIEWS[this.view];
    const head = lookAtHead ? this.model?.getObjectByName('Head') : undefined;
    const goal = head ? head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 2.4, 0)) : BODY_CENTER;
    const t = Math.min(1, delta * 6);
    this.target.lerp(goal, t);
    const position = this.target.clone().add(new THREE.Vector3(0, this.mode === '3d' ? 1 : 0, distance));
    this.perspective.position.lerp(position, t);
    this.perspective.lookAt(this.target);

    // La cámara plana muestra lo mismo que la de perspectiva a la altura del Mii.
    const halfHeight = this.perspective.position.distanceTo(this.target) * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const halfWidth = halfHeight * this.perspective.aspect;
    Object.assign(this.flat, { left: -halfWidth, right: halfWidth, top: halfHeight, bottom: -halfHeight });
    this.flat.updateProjectionMatrix();
    this.flat.position.copy(this.perspective.position);
    this.flat.quaternion.copy(this.perspective.quaternion);
  }

  private loop = () => {
    this.frame = requestAnimationFrame(this.loop);
    const delta = this.clock.getDelta();
    const is3d = this.mode === '3d';
    this.mixer?.update(is3d ? delta : 0);
    if (this.model) this.model.rotation.y = is3d ? Math.sin(this.clock.elapsedTime * 0.6) * 0.25 : 0;
    this.moveCamera(delta);
    this.renderer.render(this.scene, is3d ? this.perspective : this.flat);
  };
}
