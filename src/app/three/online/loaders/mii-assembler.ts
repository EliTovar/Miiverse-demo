import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AdjustablePart, MiiAppearance, adjustment } from './mii-appearance';
import { drawFace } from './mii-face';

/*
 * Arma un Mii a partir de piezas sueltas (cuerpo, ropa, cabeza, pelo, nariz).
 *
 * Cómo funciona:
 * - El cuerpo trae el esqueleto. La ropa usa los MISMOS nombres de huesos
 *   (Arm_1_L, Leg_1_L…), así que "re-enlazamos" cada prenda a los huesos del
 *   cuerpo y se mueve con él sin animarla aparte.
 * - Cabeza, pelo, nariz, barba y lentes son mallas rígidas que cuelgan del hueso "Head".
 * - Todas las piezas vienen en blanco y se tiñen con los colores de la apariencia.
 * - La cara (ojos, cejas, boca…) se dibuja en un canvas (ver mii-face.ts).
 */

const PARTS_PATH = 'models/mii-parts';
const MANNEQUIN_FACE = `${PARTS_PATH}/mannequin/face.png`;
const MANNEQUIN_COLOR = '#f4f1ea';

/** Partes del cuerpo que se ocultan porque la prenda las cubre (evita que se asomen). */
const HIDDEN_BY = {
  top: /^Body(Chest|Waist)__/,
  bottoms: /^BodyHip__/,
  shoes: /^Body(Foot|Sole)__/,
};

/**
 * Nariz y lentes vienen modelados en el origen y mirando hacia atrás:
 * los colocamos sobre la cara (en el espacio de la cabeza). Ajustado a ojo.
 */
const NOSE_OFFSET = new THREE.Vector3(0, 0.3, 0.1);
const GLASSES_OFFSET = new THREE.Vector3(0, 0.305, 0.3);
/** Los lentes vienen más anchos que la cara: se reducen para que no sobresalgan al girar. */
const GLASSES_SCALE = 0.8;

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const partCache = new Map<string, Promise<THREE.Group>>();
const textureCache = new Map<string, THREE.Texture>();

/** Carga cada GLB una sola vez; las siguientes llamadas reutilizan la misma promesa. */
function loadPart(category: string, id: string): Promise<THREE.Group> {
  const url = `${PARTS_PATH}/${category}/${id}.glb`;
  let promise = partCache.get(url);
  if (!promise) {
    promise = loader.loadAsync(url).then((gltf) => gltf.scene);
    partCache.set(url, promise);
  }
  return promise;
}

function getTexture(url: string): THREE.Texture {
  let texture = textureCache.get(url);
  if (!texture) {
    texture = textureLoader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(url, texture);
  }
  return texture;
}

/** La malla "Mask" de la cabeza lleva la cara (textura); el resto de la cabeza, el color de piel. */
function paintHead(skin: string, face: THREE.Texture) {
  return (mesh: THREE.Mesh) => {
    if (!mesh.name.startsWith('Mask')) return skin;
    mesh.material = new THREE.MeshStandardMaterial({ map: face, transparent: true, roughness: 0.8 });
    return null;
  };
}

/** La línea de la nariz: una malla con una máscara; se pinta oscura donde la máscara es blanca. */
function paintNose(skin: string, lineUrl: string) {
  return (mesh: THREE.Mesh) => {
    if (!mesh.name.startsWith('NoseLine')) return skin;
    const alphaMap = getTexture(lineUrl);
    mesh.material = new THREE.MeshBasicMaterial({ color: '#000000', alphaMap, transparent: true, opacity: 0.35, depthWrite: false });
    return null;
  };
}

/** Lentes: la montura ("Flame") lleva el color; los cristales son casi transparentes. */
function paintGlasses(color: string) {
  return (mesh: THREE.Mesh) => {
    if (mesh.name.startsWith('Flame')) return color;
    mesh.material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, depthWrite: false });
    return null;
  };
}

/** Tamaño del cuerpo según altura y peso (0..1). La cabeza no cambia de tamaño. */
function bodyScale(height: number, weight: number) {
  const w = 0.8 + 0.45 * weight;
  return new THREE.Vector3(w, 0.85 + 0.3 * height, w);
}

/** Clona el cuerpo base y devuelve sus huesos por nombre. */
function cloneBody(body: THREE.Group) {
  const model = SkeletonUtils.clone(body) as THREE.Group;
  const bones = new Map<string, THREE.Bone>();
  model.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone);
  });
  return { model, bones };
}

/** Copia el material para que cada jugador tenga su propio color. */
function tint(mesh: THREE.Mesh, color: string) {
  const material = (mesh.material as THREE.MeshStandardMaterial).clone();
  material.color.set(color);
  mesh.material = material;
}

function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  return meshes;
}

/** Copia las mallas de una prenda y las enlaza a los huesos del cuerpo (por nombre). */
function dressWith(
  garment: THREE.Group,
  bodyBones: Map<string, THREE.Bone>,
  parent: THREE.Object3D,
  color: string
) {
  for (const source of collectMeshes(garment)) {
    if (!(source as THREE.SkinnedMesh).isSkinnedMesh) continue;
    const skinned = source as THREE.SkinnedMesh;
    const mesh = new THREE.SkinnedMesh(skinned.geometry, skinned.material);
    mesh.name = skinned.name;
    // Huesos extra de la prenda (p. ej. los de una falda) no existen en el cuerpo:
    // usamos su hueso padre más cercano que sí exista, para que no queden sueltos.
    const bones = skinned.skeleton.bones.map((bone) => {
      let current: THREE.Object3D | null = bone;
      while (current && !bodyBones.has(current.name)) current = current.parent;
      return bodyBones.get(current?.name ?? 'Skl_Root')!;
    });
    mesh.bind(new THREE.Skeleton(bones, skinned.skeleton.boneInverses), skinned.bindMatrix);
    tint(mesh, color);
    parent.add(mesh);
  }
}

/**
 * Crea un grupo colgado del hueso Head cuyo origen coincide con el de los
 * archivos de cabeza/pelo/nariz (que están modelados con la cabeza en el origen).
 */
function createHeadAnchor(model: THREE.Object3D, headBone: THREE.Bone, bodySize = new THREE.Vector3(1, 1, 1)): THREE.Group {
  model.updateMatrixWorld(true);
  const toModel = model.matrixWorld.clone().invert();
  const boneInModel = toModel.clone().multiply(headBone.matrixWorld);
  const headPosition = new THREE.Vector3().setFromMatrixPosition(boneInModel);

  const anchor = new THREE.Group();
  anchor.name = 'HeadAnchor';
  anchor.matrixAutoUpdate = false;
  // Deshace la escala del cuerpo (altura/peso) para que la cabeza mantenga su tamaño.
  const undoBodySize = new THREE.Matrix4().makeScale(1 / bodySize.x, 1 / bodySize.y, 1 / bodySize.z);
  anchor.matrix.copy(boneInModel.invert()).multiply(new THREE.Matrix4().makeTranslation(headPosition)).multiply(undoBodySize);
  headBone.add(anchor);
  return anchor;
}

/**
 * Grupo colocado sobre la cara y girado hacia el frente (ver NOSE_OFFSET).
 * Aplica los controles "subir/bajar" y "tamaño" del usuario (igual que en la cara dibujada).
 */
function onFace(anchor: THREE.Object3D, offset: THREE.Vector3, appearance: MiiAppearance, part: AdjustablePart, scale = 1): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(offset);
  group.position.y += (adjustment(appearance, part, 'y') - 0.5) * 0.16;
  group.scale.setScalar(scale * (1 + (adjustment(appearance, part, 'scale') - 0.5) * 0.8));
  group.rotation.y = Math.PI;
  anchor.add(group);
  return group;
}

function addRigid(source: THREE.Group, parent: THREE.Object3D, colorFor: (mesh: THREE.Mesh) => string | null) {
  const copy = source.clone();
  for (const mesh of collectMeshes(copy)) {
    const color = colorFor(mesh);
    if (color) tint(mesh, color);
  }
  parent.add(copy);
  return copy;
}

export async function buildMii(appearance: MiiAppearance): Promise<THREE.Group> {
  const optional = (category: string, id: string | null) => (id ? loadPart(category, id) : null);
  const [body, top, bottoms, shoes, head, hair, nose, beard, glasses, faceCanvas] = await Promise.all([
    loadPart('body', 'body'),
    loadPart('tops', appearance.top),
    loadPart('bottoms', appearance.bottoms),
    loadPart('shoes', appearance.shoes),
    loadPart('heads', appearance.head),
    loadPart('hair', appearance.hair),
    loadPart('noses', appearance.nose),
    optional('beards', appearance.beard),
    optional('glasses', appearance.glasses),
    drawFace(appearance),
  ]);
  const { colors } = appearance;

  const { model, bones: bodyBones } = cloneBody(body);
  const size = bodyScale(appearance.height, appearance.weight);
  model.scale.copy(size);

  const bodyMeshes = collectMeshes(model);
  const meshParent = bodyMeshes[0].parent!;
  const hidden = [HIDDEN_BY.top, HIDDEN_BY.bottoms, HIDDEN_BY.shoes];
  for (const mesh of bodyMeshes) {
    tint(mesh, colors.skin);
    mesh.visible = !hidden.some((pattern) => pattern.test(mesh.name));
  }

  dressWith(top, bodyBones, meshParent, colors.favorite);
  dressWith(bottoms, bodyBones, meshParent, colors.bottoms);
  dressWith(shoes, bodyBones, meshParent, colors.shoes);

  const face = new THREE.CanvasTexture(faceCanvas);
  face.colorSpace = THREE.SRGBColorSpace;

  const anchor = createHeadAnchor(model, bodyBones.get('Head')!, size);
  addRigid(head, anchor, paintHead(colors.skin, face));
  const hairMesh = addRigid(hair, anchor, () => colors.hair);
  if (appearance.hairFlip) hairMesh.scale.x = -1; // espejo
  if (beard) addRigid(beard, anchor, () => colors.hair);
  if (glasses) addRigid(glasses, onFace(anchor, GLASSES_OFFSET, appearance, 'glasses', GLASSES_SCALE), paintGlasses(colors.glasses));
  addRigid(nose, onFace(anchor, NOSE_OFFSET, appearance, 'nose'), paintNose(colors.skin, `${PARTS_PATH}/noses/${appearance.nose}-line.png`));

  return model;
}

/**
 * Maniquí: el Mii de quien todavía no ha creado el suyo.
 * Mismo cuerpo, sin ropa ni pelo, todo blanco y con una cara sencilla.
 */
export async function buildMannequin(): Promise<THREE.Group> {
  const [body, head] = await Promise.all([loadPart('body', 'body'), loadPart('mannequin', 'head')]);
  const { model, bones } = cloneBody(body);
  for (const mesh of collectMeshes(model)) tint(mesh, MANNEQUIN_COLOR);
  addRigid(head, createHeadAnchor(model, bones.get('Head')!), paintHead(MANNEQUIN_COLOR, getTexture(MANNEQUIN_FACE)));
  return model;
}
