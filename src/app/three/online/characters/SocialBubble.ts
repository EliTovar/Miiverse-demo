import * as THREE from 'three';
import { backendUrl } from '../../../core/config/api.config';

export class SocialBubble {
  public mesh: THREE.Group;
  private plane: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private frameMaterial: THREE.MeshBasicMaterial;
  private loader = new THREE.TextureLoader();

  private isVisible = false;
  private timer: any;

  constructor() {
    this.mesh = new THREE.Group();

    // Crear geometría de la burbuja (Proporción Miiverse 320:120 -> 2.66)
    const geometry = new THREE.PlaneGeometry(8, 3);
    
    // El dibujo se ve tal cual, sin luces ni brillo.
    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 0
    });

    this.plane = new THREE.Mesh(geometry, this.material);
    
    // Bocadillo blanco redondeado con pico hacia abajo, como en la plaza de Wii U.
    this.frameMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0,
        side: THREE.DoubleSide
    });
    const frame = new THREE.Mesh(new THREE.ShapeGeometry(createBubbleShape(9, 4, 1.2)), this.frameMaterial);
    frame.position.z = -0.01;

    this.mesh.add(this.plane);
    this.mesh.add(frame);
    
    this.mesh.visible = false;
  }

  show(url: string, duration = 60000) {
    // 🧹 Limpiar timer anterior si existe
    if (this.timer) clearTimeout(this.timer);

    // El dibujo llega como ruta del backend (/miiverse/posts/:id/drawing).
    this.loader.load(backendUrl(url) ?? url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      this.material.map = texture;
      this.material.opacity = 1;
      this.frameMaterial.opacity = 0.95;
      
      this.mesh.visible = true;
      this.isVisible = true;

      // 🕒 Auto-ocultar tras el tiempo definido (60s por defecto)
      this.timer = setTimeout(() => {
        this.hide();
      }, duration);
    });
  }

  hide() {
    this.mesh.visible = false;
    this.isVisible = false;
    if (this.material.map) {
      this.material.map.dispose();
      this.material.map = null;
    }
  }

  update(camera: THREE.Camera, playerPos: THREE.Vector3) {
    if (!this.isVisible) return;

    // Posicionar sobre la cabeza (Ajustar offset según altura del modelo)
    this.mesh.position.set(
      playerPos.x,
      playerPos.y + 11, // Altura estimada para el Mii
      playerPos.z
    );

    // Billboard: Siempre mirar a la cámara
    this.mesh.lookAt(camera.position);
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.material.dispose();
    this.mesh.children.forEach(c => {
        if (c instanceof THREE.Mesh) {
            c.geometry.dispose();
            if (c.material instanceof THREE.Material) c.material.dispose();
        }
    });
  }
}

/** Rectángulo redondeado de `w`×`h` centrado en el origen, con un pico abajo en el centro. */
function createBubbleShape(w: number, h: number, r: number): THREE.Shape {
  const x = -w / 2;
  const y = -h / 2;
  const tail = 0.7;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(-tail, y);
  shape.lineTo(0, y - tail * 1.2);
  shape.lineTo(tail, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}
