import * as THREE from 'three';
import { createMiiAnimations } from './mii-animations';
import { buildMannequin, buildMii } from './mii-assembler';
import { MiiAppearance } from './mii-appearance';

export interface LoadedCharacter {
  model: THREE.Group;
  animations: THREE.AnimationClip[];
}

// El Mii (con cabeza) mide ~1.8 unidades de alto; así queda de ~10, como el personaje anterior.
const MODEL_SCALE = 5.5;

let cachedAnimations: THREE.AnimationClip[] | null = null;

/**
 * Crea un personaje con la apariencia indicada, o el maniquí si es `null`
 * (usuario que todavía no ha creado su Mii).
 * Las piezas (GLB) se descargan una sola vez y se reutilizan entre jugadores.
 */
export async function loadCharacter(appearance: MiiAppearance | null = null): Promise<LoadedCharacter> {
  const model = appearance ? await buildMii(appearance) : await buildMannequin();
  model.scale.setScalar(MODEL_SCALE);

  cachedAnimations ??= createMiiAnimations(model);
  return { model, animations: cachedAnimations };
}
