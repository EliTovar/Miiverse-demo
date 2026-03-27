import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

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

export async function loadFBXCharacter(): Promise<LoadedCharacter> {
  const loader = new FBXLoader();

  // 🔹 Cargar modelo base
  const model = await loadFBX(loader, MODEL_PATH);

  model.scale.set(0.04, 0.04, 0.04);
  model.position.set(0, 0, 0);
  model.traverse((obj) => {
    obj.castShadow = true;
    obj.receiveShadow = true;
  });

  // 🔹 Cargar animaciones
  const animations: THREE.AnimationClip[] = [];

  for (const [name, path] of Object.entries(ANIMATION_PATHS)) {
    const animFBX = await loadFBX(loader, path);

    if (!animFBX.animations.length) {
      console.warn(`⚠️ Animación vacía: ${name}`);
      continue;
    }

    const clip = animFBX.animations[0];
    clip.name = name; // 🔑 nombre consistente
    animations.push(clip);
  }

  return { model, animations };
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
