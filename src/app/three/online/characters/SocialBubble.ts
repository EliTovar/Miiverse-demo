import * as THREE from 'three';

export class SocialBubble {
  public mesh: THREE.Group;
  private plane: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;
  private frameMaterial: THREE.MeshBasicMaterial;
  private loader = new THREE.TextureLoader();

  private isVisible = false;
  private timer: any;

  constructor() {
    this.mesh = new THREE.Group();

    // Crear geometría de la burbuja (Proporción Miiverse 320:120 -> 2.66)
    const geometry = new THREE.PlaneGeometry(8, 3);
    
    // Material con borde brillante
    this.material = new THREE.MeshStandardMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0x0096fa),
      emissiveIntensity: 0.5,
      opacity: 0
    });

    this.plane = new THREE.Mesh(geometry, this.material);
    
    // Marco decorativo (Estilo Miiverse)
    const frameGeo = new THREE.PlaneGeometry(8.4, 3.4);
    this.frameMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x1a1a1a, 
        transparent: true, 
        opacity: 0 
    });
    const frame = new THREE.Mesh(frameGeo, this.frameMaterial);
    frame.position.z = -0.01;

    this.mesh.add(this.plane);
    this.mesh.add(frame);
    
    this.mesh.visible = false;
  }

  show(url: string, duration = 60000) {
    // 🧹 Limpiar timer anterior si existe
    if (this.timer) clearTimeout(this.timer);

    this.loader.load(url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      this.material.map = texture;
      this.material.opacity = 1;
      this.frameMaterial.opacity = 0.9;
      
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
