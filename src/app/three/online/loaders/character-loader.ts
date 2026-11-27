import * as THREE from 'three';
import { createMiiAnimations } from './mii-animations';
import { buildMii } from './mii-assembler';
import { DEFAULT_APPEARANCE, MiiAppearance } from './mii-appearance';

export interface LoadedCharacter {
  model: THREE.Group;
  animations: THREE.AnimationClip[];
}

// El Mii (con cabeza) mide ~1.8 unidades de alto; así queda de ~10, como el personaje anterior.
const MODEL_SCALE = 5.5;

let cachedAnimations: THREE.AnimationClip[] | null = null;

/**
 * Crea un personaje nuevo con la apariencia indicada.
 * Las piezas (GLB) se descargan una sola vez y se reutilizan entre jugadores.
 */
export async function loadCharacter(appearance: MiiAppearance = DEFAULT_APPEARANCE): Promise<LoadedCharacter> {
  const model = await buildMii(appearance);
  model.scale.setScalar(MODEL_SCALE);

  cachedAnimations ??= createMiiAnimations(model);
  return { model, animations: cachedAnimations };
}
