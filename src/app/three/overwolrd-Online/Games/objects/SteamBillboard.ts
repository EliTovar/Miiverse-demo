// three/Games/objects/SteamBillboard.ts

import * as THREE from 'three';

export class SteamBillboard {
  public mesh: THREE.Group;

  private material: THREE.MeshStandardMaterial;
  private glowMaterial: THREE.MeshStandardMaterial;
  
  // 🔥 Canvas para el renderizado "Bulletproof"
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private canvasTexture: THREE.CanvasTexture;

  private width: number;
  private height: number;

  constructor(width = 12, height = 12, radius = 0.6) {
    this.width = width;
    this.height = height;
    this.mesh = new THREE.Group();

    // 1. Inicializar Canvas 2D para manejo de texturas perfecto
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 1024;
    this.ctx = this.canvas.getContext('2d')!;
    
    // Limpiar fondo inicialmente
    this.ctx.fillStyle = '#0a0f17';
    this.ctx.fillRect(0, 0, 1024, 1024);
    
    this.canvasTexture = new THREE.CanvasTexture(this.canvas);
    this.canvasTexture.colorSpace = THREE.SRGBColorSpace;

    // 2. Crear forma con esquinas redondeadas
    const shape = this.createRoundedRectShape(width, height, radius);
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.center();

    // 🔥 NORMALIZACIÓN MANUAL DE UVs (Solución definitiva al estiramiento)
    // Las ShapeGeometry usan coordenadas de mundo para los UVs por defecto. 
    // Aquí obligamos a que el 100% de la superficie mapee al 100% del CanvasTexture (0 a 1).
    const uvAttribute = geometry.attributes['uv'];
    const positionAttribute = geometry.attributes['position'];
    
    if (uvAttribute && positionAttribute) {
        for (let i = 0; i < positionAttribute.count; i++) {
            // Obtenemos la posición X e Y del vértice (que va de -width/2 a width/2)
            const x = positionAttribute.getX(i);
            const y = positionAttribute.getY(i);
            
            // Convertimos a un rango 0 a 1
            const u = (x + width / 2) / width;
            const v = (y + height / 2) / height;
            
            uvAttribute.setXY(i, u, v);
        }
        uvAttribute.needsUpdate = true;
    }

    // 3. Material del póster (Brillo LED equilibrado)
    this.material = new THREE.MeshStandardMaterial({
      map: this.canvasTexture,
      emissiveMap: this.canvasTexture,
      emissive: 0xffffff,
      emissiveIntensity: 1.0, 
      transparent: true,
      side: THREE.DoubleSide
    });

    this.poster = new THREE.Mesh(geometry, this.material);

    // 4. Marco de brillo (glow)
    const glowGeometry = new THREE.ShapeGeometry(
      this.createRoundedRectShape(width + 0.3, height + 0.3, radius + 0.05)
    );
    glowGeometry.center();

    this.glowMaterial = new THREE.MeshStandardMaterial({
      color: 0x66c0f4,
      emissive: 0x66c0f4,
      emissiveIntensity: 6,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });

    this.glow = new THREE.Mesh(glowGeometry, this.glowMaterial);
    this.glow.position.z = -0.05;

    this.mesh.add(this.glow);
    this.mesh.add(this.poster);
  }

  private poster: THREE.Mesh;
  private glow: THREE.Mesh;

  private createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + height - radius);
    shape.quadraticCurveTo(x, y + height, x + radius, y + height);
    shape.lineTo(x + width - radius, y + height);
    shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    shape.lineTo(x + width, y + radius);
    shape.quadraticCurveTo(x + width, y, x + width - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);
    return shape;
  }

  setPosition(x: number, y: number, z: number) {
    this.mesh.position.set(x, y, z);
  }

  setImage(url: string) {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 🔥 Crucial para evitar errores de seguridad en Canvas
    img.onload = () => {
      this.drawToCanvas(img);
    };
    img.onerror = () => {
      this.setFallback();
    };
    img.src = url;
  }

  private drawToCanvas(img: HTMLImageElement) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const iw = img.width;
    const ih = img.height;
    
    // 🎨 LÓGICA DE RECORTADO "COVER" (Como en CSS)
    // Esto garantiza que la imagen llene el cuadrado sin deformarse
    const ratio = Math.max(cw / iw, ch / ih);
    const nw = iw * ratio;
    const nh = ih * ratio;
    const nx = (cw - nw) / 2; // Centrado horizontal
    const ny = (ch - nh) / 2; // Centrado vertical

    // Dibujar en el lienzo 2D
    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.fillStyle = '#0a0f17';
    this.ctx.fillRect(0, 0, cw, ch);
    this.ctx.drawImage(img, nx, ny, nw, nh);
    
    // Notificar a Three.js que la textura ha cambiado
    this.canvasTexture.needsUpdate = true;
  }

  private setFallback() {
    this.setImage('https://cdn.cloudflare.steamstatic.com/steam/apps/570/library_600x900_2x.jpg');
  }

  onHover(active: boolean) {
    this.glowMaterial.emissiveIntensity = active ? 4 : 2;
    this.glowMaterial.opacity = active ? 0.8 : 0.5;
  }

  update(time: number) {
    const pulse = Math.sin(time * 0.003) * 0.5 + 1.5;
    const baseGlow = this.glowMaterial.opacity > 0.6 ? 4 : 2; 
    this.glowMaterial.emissiveIntensity = baseGlow * (pulse * 0.5 + 0.5);
  }

  lookAt(camera: THREE.Camera) {
    this.mesh.lookAt(camera.position);
  }
}