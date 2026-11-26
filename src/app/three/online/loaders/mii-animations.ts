import * as THREE from 'three';

/*
 * Animaciones del Mii generadas por código.
 *
 * Por qué: las animaciones del gato son de Mixamo y usan huesos "mixamorig:*".
 * El Mii tiene un esqueleto de Nintendo de solo 16 huesos (arm_l1, foot_r1, ...),
 * así que reasignarlas (retargeting) daría poses rotas. Con tan pocos huesos es
 * más simple crear clips sencillos aquí, con keyframes de rotación.
 *
 * Ejes locales de los huesos del Mii: X = lado (izquierda del Mii en +X),
 * Y = arriba, Z = frente. Los brazos vienen en pose de "T" (apuntando a ±X).
 */

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);
const ARM_DOWN = THREE.MathUtils.degToRad(75); // cuánto bajar los brazos desde la pose en T

/** Rotación de un hueso: primero baja/sube el brazo (eje Z) y luego lo balancea (eje X). */
function rot(lower: number, swing: number): number[] {
  const q = new THREE.Quaternion().setFromAxisAngle(X, swing);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, lower));
  return q.toArray();
}

/** Crea un track de cuaternión muestreando f(t) en `steps` puntos (el último = el primero para hacer bucle). */
function track(bone: string, duration: number, steps: number, f: (phase: number) => number[]) {
  const times: number[] = [];
  const values: number[] = [];
  for (let i = 0; i <= steps; i++) {
    times.push((duration * i) / steps);
    values.push(...f((Math.PI * 2 * i) / steps));
  }
  return new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, values);
}

/** Caminar (dir = 1) o caminar hacia atrás (dir = -1): brazos y piernas en oposición. */
function walkClip(name: string, dir: 1 | -1, duration: number) {
  const arm = THREE.MathUtils.degToRad(35);
  const leg = THREE.MathUtils.degToRad(30);
  const s = (p: number) => Math.sin(p) * dir;
  return new THREE.AnimationClip(name, duration, [
    track('arm_l1', duration, 16, (p) => rot(-ARM_DOWN, s(p) * arm)),
    track('arm_r1', duration, 16, (p) => rot(ARM_DOWN, -s(p) * arm)),
    track('foot_l1', duration, 16, (p) => rot(0, -s(p) * leg)),
    track('foot_r1', duration, 16, (p) => rot(0, s(p) * leg)),
  ]);
}

export function createMiiAnimations(): THREE.AnimationClip[] {
  const sway = THREE.MathUtils.degToRad(4);
  const idle = new THREE.AnimationClip('idle', 2, [
    track('arm_l1', 2, 8, (p) => rot(-ARM_DOWN + Math.sin(p) * sway, 0)),
    track('arm_r1', 2, 8, (p) => rot(ARM_DOWN - Math.sin(p) * sway, 0)),
  ]);

  // Salto: brazos arriba (se reproduce una sola vez, ver CharacterController.play).
  const armsUp = THREE.MathUtils.degToRad(50);
  const jump = new THREE.AnimationClip('jump', 0.25, [
    track('arm_l1', 0.25, 1, (p) => rot(p === 0 ? -ARM_DOWN : armsUp, 0)),
    track('arm_r1', 0.25, 1, (p) => rot(p === 0 ? ARM_DOWN : -armsUp, 0)),
  ]);

  return [idle, walkClip('walk', 1, 0.8), walkClip('back', -1, 1), jump];
}
