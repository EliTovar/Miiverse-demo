// src/three/LabelManager.ts
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class LabelManager {
  scene: THREE.Scene;
  labelRenderer: CSS2DRenderer;
  currentLabel: CSS2DObject | null = null;

  constructor(scene: THREE.Scene, container: HTMLElement) {
    this.scene = scene;

    // --- Inicializa el renderer 2D ---
    this.labelRenderer = new CSS2DRenderer();
    const width = container.clientWidth;
    const height = container.clientHeight;

this.labelRenderer.setSize(width, height);

    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.labelRenderer.domElement.style.zIndex = '0';
    container.appendChild(this.labelRenderer.domElement);
    // document.body.appendChild(this.labelRenderer.domElement);

    // --- Responsivo ---
    window.addEventListener('resize', () => {
      const width = container.clientWidth;
        const height = container.clientHeight;

        this.labelRenderer.setSize(width, height);
    });
  }

  /**
   * Crea o reemplaza el label flotante sobre un objeto.
   */
  showLabel(target: THREE.Object3D, text: string) {
    // Elimina el label anterior solo si es el mismo tipo o si queremos reemplazarlo
    if (this.currentLabel) {
      this.scene.remove(this.currentLabel);
    }

    const div = document.createElement('div');
    div.className = 'label';
    div.textContent = text;
    
    // Estilo Premium
    div.style.color = '#fff';
    div.style.background = 'rgba(0, 170, 255, 0.2)';
    div.style.backdropFilter = 'blur(8px)';
    div.style.border = '1px solid rgba(0, 170, 255, 0.5)';
    div.style.padding = '10px 15px';
    div.style.borderRadius = '15px';
    div.style.fontFamily = "'Outfit', sans-serif";
    div.style.fontSize = '14px';
    div.style.boxShadow = '0 0 20px rgba(0, 170, 255, 0.3)';
    div.style.whiteSpace = 'pre-line';
    div.style.maxWidth = '250px';
    div.style.textAlign = 'center';
    div.style.animation = 'floatIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)';

    const labelObj = new CSS2DObject(div);
    this.scene.add(labelObj);
    this.currentLabel = labelObj;
    
    // Guardar referencia al target para orbitar
    (labelObj as any).target = target;
    (labelObj as any).angle = 0;
  }

  render(scene: THREE.Scene, camera: THREE.Camera) {
    if (this.currentLabel) {
      const label = this.currentLabel as any;
      if (label.target) {
        // Lógica de Órbita
        label.angle += 0.005; // Velocidad de órbita
        const radius = 2.5;
        
        // Mantener el label legible delante o a los lados
        label.position.x = label.target.position.x + Math.sin(label.angle) * radius;
        label.position.z = label.target.position.z + Math.cos(label.angle) * radius;
        label.position.y = label.target.position.y + 1.2 + Math.sin(label.angle * 2) * 0.2;
      }
    }
    this.labelRenderer.render(scene, camera);
  }
}
