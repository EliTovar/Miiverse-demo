import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MiiAppearance } from './mii-appearance';

/*
 * Arma un Mii a partir de piezas sueltas (cuerpo, ropa, cabeza, pelo, nariz).
 *
 * Cómo funciona:
 * - El cuerpo trae el esqueleto. La ropa usa los MISMOS nombres de huesos
 *   (Arm_1_L, Leg_1_L…), así que "re-enlazamos" cada prenda a los huesos del
 *   cuerpo y se mueve con él sin animarla aparte.
 * - Cabeza, pelo y nariz son mallas rígidas que cuelgan del hueso "Head".
 * - Todas las piezas vienen en blanco y se tiñen con los colores de la apariencia.
 */

const PARTS_PATH = 'models/mii-parts';
const FACE_TEXTURE = `${PARTS_PATH}/faces/face-default.png`;

/** Partes del cuerpo que se ocultan porque la prenda las cubre (evita que se asomen). */
const HIDDEN_BY = {
  top: /^Body(Chest|Waist)__/,
  bottoms: /^BodyHip__/,
  shoes: /^Body(Foot|Sole)__/,
};

/** Posición de la nariz sobre la cara (en el espacio de la cabeza). Ajustada a ojo. */
const NOSE_OFFSET = new THREE.Vector3(0, 0.3, 0.1);

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const partCache = new Map<string, Promise<THREE.Group>>();
let faceTexture: THREE.Texture | null = null;

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

function getFaceTexture(): THREE.Texture {
  if (!faceTexture) {
    faceTexture = textureLoader.load(FACE_TEXTURE);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return faceTexture;
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
function createHeadAnchor(model: THREE.Object3D, headBone: THREE.Bone): THREE.Group {
  model.updateMatrixWorld(true);
  const toModel = model.matrixWorld.clone().invert();
  const boneInModel = toModel.clone().multiply(headBone.matrixWorld);
  const headPosition = new THREE.Vector3().setFromMatrixPosition(boneInModel);

  const anchor = new THREE.Group();
  anchor.name = 'HeadAnchor';
  anchor.matrixAutoUpdate = false;
  anchor.matrix.copy(boneInModel.invert()).multiply(new THREE.Matrix4().makeTranslation(headPosition));
  headBone.add(anchor);
  return anchor;
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
  const [body, top, bottoms, shoes, head, hair, nose] = await Promise.all([
    loadPart('body', 'body'),
    loadPart('tops', appearance.top),
    loadPart('bottoms', appearance.bottoms),
    loadPart('shoes', appearance.shoes),
    loadPart('heads', appearance.head),
    loadPart('hair', appearance.hair),
    loadPart('noses', appearance.nose),
  ]);
  const { colors } = appearance;

  const model = SkeletonUtils.clone(body) as THREE.Group;
  const bodyBones = new Map<string, THREE.Bone>();
  model.traverse((o) => {
    if ((o as THREE.Bone).isBone) bodyBones.set(o.name, o as THREE.Bone);
  });

  const bodyMeshes = collectMeshes(model);
  const meshParent = bodyMeshes[0].parent!;
  const hidden = [HIDDEN_BY.top, HIDDEN_BY.bottoms, HIDDEN_BY.shoes];
  for (const mesh of bodyMeshes) {
    tint(mesh, colors.skin);
    mesh.visible = !hidden.some((pattern) => pattern.test(mesh.name));
  }

  dressWith(top, bodyBones, meshParent, colors.top);
  dressWith(bottoms, bodyBones, meshParent, colors.bottoms);
  dressWith(shoes, bodyBones, meshParent, colors.shoes);

  const anchor = createHeadAnchor(model, bodyBones.get('Head')!);
  addRigid(head, anchor, (mesh) => {
    if (!mesh.name.startsWith('Mask')) return colors.skin;
    mesh.material = new THREE.MeshStandardMaterial({ map: getFaceTexture(), transparent: true, roughness: 0.8 });
    return null;
  });
  addRigid(hair, anchor, () => colors.hair);
  const noseGroup = new THREE.Group();
  noseGroup.position.copy(NOSE_OFFSET);
  noseGroup.rotation.y = Math.PI; // la nariz viene modelada mirando hacia atrás
  anchor.add(noseGroup);
  addRigid(nose, noseGroup, (mesh) => (mesh.name.startsWith('NoseLine') ? null : colors.skin)).traverse((o) => {
    if (o.name.startsWith('NoseLine')) o.visible = false;
  });

  return model;
}
