// three/loaders/ModelLoaderManager.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class ModelLoaderManager {
  gltfLoader = new GLTFLoader();
  fbxLoader = new FBXLoader();

  loadGLTF(path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(path, gltf => resolve(gltf.scene), reject);
    });
  }

  loadFBX(path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.fbxLoader.load(path, resolve, undefined, reject);
    });
  }
}
