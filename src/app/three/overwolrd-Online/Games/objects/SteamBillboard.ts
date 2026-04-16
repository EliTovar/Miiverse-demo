// three/Games/objects/SteamBillboard.ts

import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D tex1;
  uniform sampler2D tex2;
  uniform float transition;
  uniform float uOpacity;
  uniform float emissiveIntensity;
  varying vec2 vUv;

  void main() {
    vec4 color1 = texture2D(tex1, vUv);
    vec4 color2 = texture2D(tex2, vUv);
    
    vec4 finalColor = mix(color1, color2, transition);
    
    // Multiplicar por intensidad de emisión y por opacidad externa
    gl_FragColor = vec4(finalColor.rgb * emissiveIntensity, finalColor.a * uOpacity);
  }
`;

export class SteamBillboard {
  public mesh: THREE.Group;

  private material: THREE.ShaderMaterial;
  private glowMaterial: THREE.MeshStandardMaterial;
  
  private bitmapLoader = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: 'flipY' });
  private blackTex: THREE.Texture;

  private width: number;
  private height: number;
  private thickness: number;

  constructor(width = 20, height = 20, radius = 0.6, thickness = 1.2) {
    this.width = width;
    this.height = height;
    this.thickness = thickness;
    this.mesh = new THREE.Group();

    // 1. Inicializar texturas negras por defecto
    const blackData = new Uint8Array([10, 15, 23, 255]);
    const blackTex = new THREE.DataTexture(blackData, 1, 1, THREE.RGBAFormat);
    blackTex.needsUpdate = true;
    this.blackTex = blackTex;

    // 2. Crear forma con esquinas redondeadas
    const shape = this.createRoundedRectShape(width, height, radius);
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.center();

    // NORMALIZACIÓN MANUAL DE UVs
    const uvAttribute = geometry.attributes['uv'];
    const positionAttribute = geometry.attributes['position'];
    
    if (uvAttribute && positionAttribute) {
        for (let i = 0; i < positionAttribute.count; i++) {
            const x = positionAttribute.getX(i);
            const y = positionAttribute.getY(i);
            const u = (x + width / 2) / width;
            const v = (y + height / 2) / height;
            uvAttribute.setXY(i, u, v);
        }
        uvAttribute.needsUpdate = true;
    }

    // 3. Material del póster con Shader Personalizado (GPU-side transitions)
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tex1: { value: this.blackTex },
        tex2: { value: this.blackTex },
        transition: { value: 1.0 },
        uOpacity: { value: 1.0 },
        emissiveIntensity: { value: 1.2 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.poster = new THREE.Mesh(geometry, this.material);
    this.poster.position.z = (this.thickness / 2) + 0.01;

    // 4. MARCO 3D REAL
    const frameShape = this.createRoundedRectShape(width + 0.4, height + 0.4, radius + 0.1);
    
    const extrudeSettings = {
      steps: 1,
      depth: this.thickness,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelOffset: 0,
      bevelSegments: 3
    };

    const frameGeometry = new THREE.ExtrudeGeometry(frameShape, extrudeSettings);
    frameGeometry.center();

    this.glowMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      emissive: 0x66c0f4,
      emissiveIntensity: 2,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true, // Habilitar transparencia para el marco
      opacity: 1.0
    });

    this.glow = new THREE.Mesh(frameGeometry, this.glowMaterial);
    this.glow.position.z = -this.thickness / 2;

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

  private transitionAlpha = 1.0; 
  private transitionSpeed = 0.04;

  setImage(url: string) {
    // 🔥 ULTRA-OPTIMIZACIÓN: Cargar como ImageBitmap (decodificación en Worker)
    this.bitmapLoader.load(
      url,
      (imageBitmap) => {
        const texture = new THREE.Texture(imageBitmap);
        texture.colorSpace = THREE.SRGBColorSpace;
        
        // ⚡ DESACTIVAR MIPMAPS: Evita el pico de CPU/GPU al procesar la imagen nueva
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        
        // 🧹 LIBERAR MEMORIA: Desechar la textura vieja que ya no se ve
        const oldTex = this.material.uniforms['tex1'].value;
        if (oldTex && oldTex !== this.blackTex) {
           oldTex.dispose();
        }

        // Rotar texturas
        this.material.uniforms['tex1'].value = this.material.uniforms['tex2'].value;
        this.material.uniforms['tex2'].value = texture;
        this.transitionAlpha = 0; 
      },
      undefined,
      () => {
        this.setErrorMessage('⚠️ Error de Carga');
      }
    );
  }

  public setErrorMessage(text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fondo oscuro con gradiente
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1a1a1a');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Borde rojo de advertencia
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 20;
    ctx.strokeRect(10, 10, 492, 492);

    // Texto de error
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 256);
    
    // Subtexto interactivo
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText('Reintentando en unos minutos...', 256, 320);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    // Rotar texturas
    const oldTex = this.material.uniforms['tex1'].value;
    if (oldTex && oldTex !== this.blackTex && !(oldTex instanceof THREE.CanvasTexture)) {
        oldTex.dispose();
    }

    this.material.uniforms['tex1'].value = this.material.uniforms['tex2'].value;
    this.material.uniforms['tex2'].value = texture;
    
    // Si la textura anterior era negra, mostramos el error instantáneamente
    if (this.material.uniforms['tex1'].value === this.blackTex) {
        this.transitionAlpha = 1.0;
        this.material.uniforms['transition'].value = 1.0;
    } else {
        this.transitionAlpha = 0;
    }
  }

  private setFallback() {
    this.setImage('https://cdn.cloudflare.steamstatic.com/steam/apps/570/library_600x900_2x.jpg');
  }

  onHover(active: boolean) {
    this.glowMaterial.emissiveIntensity = active ? 4 : 2;
    this.glowMaterial.opacity = active ? 0.8 : 0.5;
  }

  update(time: number) {
    // 1. Manejar transición de imagen (Uniforme para el shader)
    if (this.transitionAlpha < 1) {
      this.transitionAlpha = Math.min(1, this.transitionAlpha + this.transitionSpeed);
      this.material.uniforms['transition'].value = this.transitionAlpha;
    }

    // 2. Animación de pulso del brillo
    const pulse = Math.sin(time * 0.003) * 0.5 + 1.5;
    const baseGlow = this.glowMaterial.opacity > 0.6 ? 4 : 2; 
    this.glowMaterial.emissiveIntensity = baseGlow * (pulse * 0.5 + 0.5);
  }

  lookAt(camera: THREE.Camera) {
    this.mesh.lookAt(camera.position);
  }

  setOpacity(val: number) {
    this.material.uniforms['uOpacity'].value = val;
    this.glowMaterial.opacity = val;
  }

  dispose() {
    this.blackTex.dispose();
    this.material.uniforms['tex1'].value?.dispose();
    this.material.uniforms['tex2'].value?.dispose();
    this.material.dispose();
    this.glowMaterial.dispose();
  }
}