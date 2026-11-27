/*
 * Página que usa thumbnails.cjs: arma un Mii con el código real de la app
 * y devuelve una foto WebP (base64) de la parte que interesa.
 */
import * as THREE from 'three';
import { buildMannequin, buildMii } from '../../src/app/three/online/loaders/mii-assembler';
import { createMiiAnimations } from '../../src/app/three/online/loaders/mii-animations';
import { BASE_MIIS, DEFAULT_APPEARANCE, MII_CATALOG, MiiAppearance } from '../../src/app/three/online/loaders/mii-appearance';

const SIZE = 128;

/** Dónde mira la cámara (altura del Mii, unidades sin escalar) y cuánto acerca. */
const VIEWS = {
  face: { y: 1.5, half: 0.33 },
  beard: { y: 1.42, half: 0.38 },
  hair: { y: 1.55, half: 0.42 },
  body: { y: 0.92, half: 0.98 },
  top: { y: 1.0, half: 0.5 },
  bottoms: { y: 0.45, half: 0.42 },
  shoes: { y: 0.1, half: 0.22 },
};

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(SIZE, SIZE);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 2));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(3, 6, 8);
scene.add(sun);

async function photo(model: THREE.Object3D, view: keyof typeof VIEWS): Promise<string> {
  const { y, half } = VIEWS[view];
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 20);
  camera.position.set(0, y, 10);
  camera.lookAt(0, y, 0);
  // Pose de reposo (brazos abajo) en vez de la pose en T del modelo.
  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(createMiiAnimations(model).find((clip) => clip.name === 'idle')!).play();
  mixer.update(0);
  scene.add(model);
  await new Promise((r) => setTimeout(r, 300)); // da tiempo a que carguen las texturas
  renderer.render(scene, camera);
  scene.remove(model);
  return renderer.domElement.toDataURL('image/webp', 0.9).split(',')[1];
}

(window as any).thumb = async (appearance: MiiAppearance, view: keyof typeof VIEWS, hideHair = false) => {
  const model = await buildMii(appearance);
  if (hideHair) model.getObjectByName('HeadAnchor')!.children[1].visible = false; // [0] cabeza, [1] pelo
  return photo(model, view);
};

(window as any).mannequinThumb = async (view: keyof typeof VIEWS) => photo(await buildMannequin(), view);

/** Datos que necesita thumbnails.cjs para saber qué fotografiar. */
(window as any).data = { catalog: MII_CATALOG, base: DEFAULT_APPEARANCE, bases: BASE_MIIS };
(window as any).ready = true;
