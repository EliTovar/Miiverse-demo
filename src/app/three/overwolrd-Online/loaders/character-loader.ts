import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface LoadedCharacter {
  model: THREE.Group;
  animations: THREE.AnimationClip[];
}

const MODEL_PATH = 'models/character-3/astronaut-cat/source/Space-cat-RE.fbx';

const ANIMATION_PATHS: Record<string, string> = {
  idle: 'models/character-3/animations/cat-Re-animations/Happy Idle.fbx',
  walk: 'models/character-3/animations/cat-Re-animations/Happy Walk.fbx',
  back: 'models/character-3/animations/cat-Re-animations/Walk Backwards.fbx',
//   jump: 'models/character-3/animations/cat-Re-animations/Jump.fbx',
};

let cachedBaseModel: THREE.Group | null = null;
let cachedAnimations: THREE.AnimationClip[] | null = null;
let loadingPromise: Promise<void> | null = null; // 🔥 Puerta de carga atómica

const loader = new FBXLoader();

export async function loadFBXCharacter(): Promise<LoadedCharacter> {
  // 1. Si ya estamos cargando, esperamos a esa promesa única
  if (loadingPromise) {
    await loadingPromise;
  }

  // 2. Si no están en caché y no hay promesa en curso, iniciamos la carga maestra
  if (!cachedBaseModel || !cachedAnimations) {
    loadingPromise = (async () => {
      if (!cachedBaseModel) {
        console.log('📦 Loading base FBX model for the first time...');
        const model = await loadFBX(loader, MODEL_PATH);
        model.scale.set(0.04, 0.04, 0.04);
        model.position.set(0, 0, 0);
        cachedBaseModel = model;
      }

      if (!cachedAnimations) {
        console.log('🎬 Loading FBX animations for the first time...');
        const anims: THREE.AnimationClip[] = [];
        for (const [name, path] of Object.entries(ANIMATION_PATHS)) {
          const animFBX = await loadFBX(loader, path);
          if (animFBX.animations.length) {
            const clip = animFBX.animations[0];
            clip.name = name;

            // 🔥 Filtrar tracks para evitar que las animaciones muevan al personaje (Root Motion)
            clip.tracks = clip.tracks.filter(
              (t) => !t.name.toLowerCase().includes('.position')
            );
            anims.push(clip);
          }
        }
        cachedAnimations = anims; // Solo asignar al caché CUANDO ESTÉ COMPLETO
      }
    })();

    await loadingPromise;
    loadingPromise = null; // Liberar para futuras recargas si hicieran falta
  }

  const clonedModel = SkeletonUtils.clone(cachedBaseModel!) as THREE.Group;

  return { model: clonedModel, animations: cachedAnimations! };
}

/* =========================
   Helpers
========================= */

function loadFBX(
  loader: FBXLoader,
  path: string
): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      (fbx) => resolve(fbx),
      undefined,
      (err) => reject(err)
    );
  });
}
