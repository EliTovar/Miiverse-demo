import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createMiiAnimations } from './mii-animations';

export interface LoadedCharacter {
  model: THREE.Group;
  animations: THREE.AnimationClip[];
}

// Mii "Home Menu" de Wii U convertido de DAE a GLB (solo para pruebas).
// El gato anterior sigue en models/character-3/ por si se quiere volver a él.
const MODEL_PATH = 'models/mii/mii.glb';
const MODEL_SCALE = 0.55; // el GLB mide ~18 unidades de alto; así queda de ~10 como el gato

let cachedBaseModel: THREE.Group | null = null;
let cachedAnimations: THREE.AnimationClip[] | null = null;
let loadingPromise: Promise<void> | null = null; // 🔥 Puerta de carga atómica

const loader = new GLTFLoader();

export async function loadCharacter(): Promise<LoadedCharacter> {
  // 1. Si ya estamos cargando, esperamos a esa promesa única
  if (loadingPromise) {
    await loadingPromise;
  }

  // 2. Si no está en caché y no hay promesa en curso, iniciamos la carga maestra
  if (!cachedBaseModel || !cachedAnimations) {
    loadingPromise = (async () => {
      console.log('📦 Loading Mii model for the first time...');
      const gltf = await loader.loadAsync(MODEL_PATH);
      const model = gltf.scene;
      model.scale.setScalar(MODEL_SCALE);
      cachedBaseModel = model;
      cachedAnimations = createMiiAnimations();
    })();

    await loadingPromise;
    loadingPromise = null; // Liberar para futuras recargas si hicieran falta
  }

  const clonedModel = SkeletonUtils.clone(cachedBaseModel!) as THREE.Group;

  return { model: clonedModel, animations: cachedAnimations! };
}
