// src/three/objects/Cube.ts
import * as THREE from 'three';

export class Cube {
  mesh: THREE.Mesh;
  thoughts: THREE.Group;
  time = 0;
  isThinking = false;

  constructor() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00aaff,
      emissive: 0x002244,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 0, 0);

    // Sistema de pensamientos (esferas de luz)
    this.thoughts = new THREE.Group();
    this.createThoughts();
  }

  private createThoughts() {
    const particleCount = 12;
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    
    for (let i = 0; i < particleCount; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 2,
        transparent: true,
        opacity: 0
      });
      const p = new THREE.Mesh(geometry, material);
      
      // Posición inicial aleatoria
      resetParticle(p);
      this.thoughts.add(p);
    }
  }

  setThinking(value: boolean) {
    this.isThinking = value;
    const material = this.mesh.material as THREE.MeshStandardMaterial;
    
    if (value) {
      material.color.set(0xffaa00);
      material.emissive.set(0xff5500);
      material.emissiveIntensity = 2;
    } else {
      material.color.set(0x00aaff);
      material.emissive.set(0x002244);
      material.emissiveIntensity = 0.5;
    }

    // Mostrar/Ocultar pensamientos
    this.thoughts.children.forEach((p: any) => {
      p.material.opacity = value ? 1 : 0;
      if (value) resetParticle(p);
    });
  }

  update(delta: number) {
    this.time += delta;
    
    const rotationSpeed = this.isThinking ? 0.05 : 0.01;
    this.mesh.rotation.y += rotationSpeed;
    this.mesh.rotation.x += rotationSpeed * 0.5;

    // Levitación más fluida (estilo premium)
    this.mesh.position.y = Math.sin(this.time * 1.5) * 0.3 + Math.cos(this.time * 0.5) * 0.1;

    // Actualizar pensamientos
    if (this.isThinking) {
      this.thoughts.children.forEach((p: any, i) => {
        const t = this.time * (0.5 + (i * 0.1));
        p.position.x = Math.sin(t + i) * (1.2 + Math.sin(t * 0.5));
        p.position.z = Math.cos(t + i) * (1.2 + Math.cos(t * 0.5));
        p.position.y = Math.sin(t * 2 + i) * 0.8;
        
        p.scale.setScalar(0.8 + Math.sin(this.time * 5 + i) * 0.2);
      });
    }
    
    this.thoughts.position.copy(this.mesh.position);
  }
}

function resetParticle(p: THREE.Mesh) {
  const radius = 1.5;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos((Math.random() * 2) - 1);
  
  p.position.x = radius * Math.sin(phi) * Math.cos(theta);
  p.position.y = radius * Math.sin(phi) * Math.sin(theta);
  p.position.z = radius * Math.cos(phi);
}
