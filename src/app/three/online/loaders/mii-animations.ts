import * as THREE from 'three';

/*
 * Animaciones del Mii generadas por código.
 *
 * Por qué: el Mii (Tomodachi Life) no trae animaciones y su esqueleto no es de
 * Mixamo, así que reasignar las del gato daría poses rotas. Con pocos huesos es
 * más simple crear clips sencillos aquí, con keyframes de rotación.
 *
 * Ejes locales (comprobados visualmente):
 *   Brazos (Arm_1_*): Y = subir/bajar, X = balancear adelante/atrás (ya bajado).
 *   Piernas (Leg_1_*): Z = balancear adelante/atrás.
 * Algunos huesos del lado derecho vienen girados en reposo (Leg_1_R está rotado
 * 180°), por eso cada rotación se aplica SOBRE la rotación de reposo del hueso.
 */

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const ARM_DOWN = THREE.MathUtils.degToRad(70); // cuánto bajar los brazos desde la pose en T

/** Hueso, eje de balanceo y signos de cada extremidad (un lado suele ser el espejo del otro). */
const LIMBS = {
  armL: { bone: 'Arm_1_L', swingAxis: X, down: -1, swing: 1 },
  armR: { bone: 'Arm_1_R', swingAxis: X, down: -1, swing: 1 },
  legL: { bone: 'Leg_1_L', swingAxis: Z, down: 1, swing: 1 },
  legR: { bone: 'Leg_1_R', swingAxis: Z, down: 1, swing: 1 },
};
type Limb = (typeof LIMBS)[keyof typeof LIMBS];

/** Rotación de reposo de cada hueso animado (se lee del modelo). */
type RestPose = Map<string, THREE.Quaternion>;

/** Rotación final = reposo · balanceo · bajar brazo (eje Y). */
function rot(rest: RestPose, limb: Limb, lower: number, swing: number): number[] {
  const q = rest.get(limb.bone)!.clone();
  q.multiply(new THREE.Quaternion().setFromAxisAngle(limb.swingAxis, swing * limb.swing));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(Y, lower * limb.down));
  return q.toArray();
}

/** Crea un track de cuaternión muestreando f(t) en `steps` puntos (el último = el primero para hacer bucle). */
function track(limb: Limb, duration: number, steps: number, f: (phase: number) => number[]) {
  const times: number[] = [];
  const values: number[] = [];
  for (let i = 0; i <= steps; i++) {
    times.push((duration * i) / steps);
    values.push(...f((Math.PI * 2 * i) / steps));
  }
  return new THREE.QuaternionKeyframeTrack(`${limb.bone}.quaternion`, times, values);
}

/** Caminar (dir = 1) o caminar hacia atrás (dir = -1): brazos y piernas en oposición. */
function walkClip(rest: RestPose, name: string, dir: 1 | -1, duration: number) {
  const arm = THREE.MathUtils.degToRad(35);
  const leg = THREE.MathUtils.degToRad(30);
  const s = (p: number) => Math.sin(p) * dir;
  return new THREE.AnimationClip(name, duration, [
    track(LIMBS.armL, duration, 16, (p) => rot(rest, LIMBS.armL, ARM_DOWN, s(p) * arm)),
    track(LIMBS.armR, duration, 16, (p) => rot(rest, LIMBS.armR, ARM_DOWN, -s(p) * arm)),
    track(LIMBS.legL, duration, 16, (p) => rot(rest, LIMBS.legL, 0, -s(p) * leg)),
    track(LIMBS.legR, duration, 16, (p) => rot(rest, LIMBS.legR, 0, s(p) * leg)),
  ]);
}

/** Lee la rotación de reposo de los huesos animados. Todos los Mii comparten el mismo cuerpo. */
function readRestPose(model: THREE.Object3D): RestPose {
  const rest: RestPose = new Map();
  for (const limb of Object.values(LIMBS)) {
    const bone = model.getObjectByName(limb.bone);
    if (!bone) throw new Error(`El modelo del Mii no tiene el hueso ${limb.bone}`);
    rest.set(limb.bone, bone.quaternion.clone());
  }
  return rest;
}

export function createMiiAnimations(model: THREE.Object3D): THREE.AnimationClip[] {
  const rest = readRestPose(model);
  const sway = THREE.MathUtils.degToRad(4);
  const idle = new THREE.AnimationClip('idle', 2, [
    track(LIMBS.armL, 2, 8, (p) => rot(rest, LIMBS.armL, ARM_DOWN - Math.sin(p) * sway, 0)),
    track(LIMBS.armR, 2, 8, (p) => rot(rest, LIMBS.armR, ARM_DOWN - Math.sin(p) * sway, 0)),
  ]);

  // Salto: brazos arriba (se reproduce una sola vez, ver CharacterController.play).
  const armsUp = THREE.MathUtils.degToRad(-50);
  const jump = new THREE.AnimationClip('jump', 0.25, [
    track(LIMBS.armL, 0.25, 1, (p) => rot(rest, LIMBS.armL, p === 0 ? ARM_DOWN : armsUp, 0)),
    track(LIMBS.armR, 0.25, 1, (p) => rot(rest, LIMBS.armR, p === 0 ? ARM_DOWN : armsUp, 0)),
  ]);

  return [idle, walkClip(rest, 'walk', 1, 0.8), walkClip(rest, 'back', -1, 1), jump];
}
