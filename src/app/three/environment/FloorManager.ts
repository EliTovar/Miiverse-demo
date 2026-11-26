// three/environment/FloorManager.ts
import * as THREE from 'three';

export class FloorManager {
  floor: THREE.Mesh;
  grid: THREE.GridHelper;

  constructor(scene: THREE.Scene, size = 50) {
    // Plano físico
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.8,
      metalness: 0.2
    });

    this.floor = new THREE.Mesh(geometry, material);
    this.floor.rotation.x = -Math.PI / 2;

    // Grid visual
    this.grid = new THREE.GridHelper(size, size, 0x00ffff, 0x555555);

    scene.add(this.floor);
    scene.add(this.grid);
  }
}
