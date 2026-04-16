import * as THREE from 'three';
import { InputGate } from './InputGate';
import { SocialBubble } from './SocialBubble';

export type AnimationName = 'idle' | 'walk' | 'back' | 'jump';

interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  space: boolean;
}

export class CharacterController {
private enabled = true;


  personaje: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction> = {};
  currentAction?: THREE.AnimationAction;
  currentAnimationName: string = '';
  
  // 🟢 Social Bubble (Burbuja de dibujo)
  public socialBubble?: SocialBubble;

  // movimiento
  velocity = new THREE.Vector3();
  direction = new THREE.Vector3();
  speed = 10; // unidades por segundo
  rotationSpeed = 3;

  // salto
  isJumping = false;
  jumpVelocity = 0;
  jumpForce = 15;
  gravity = -40;

  // input
  keys: KeyState = {
    w: false,
    a: false,
    s: false,
    d: false,
    space: false,
  };

  // persistent math objects to avoid GC pressure
  private tempVector = new THREE.Vector3();

  constructor(
    personaje: THREE.Group,
    animations: THREE.AnimationClip[],
    private domElement: HTMLElement | null,
    private isLocal = false
  ) {
    console.log('🧟 CharacterController creado', this);
    this.personaje = personaje;
    this.mixer = new THREE.AnimationMixer(personaje);

    this.initAnimations(animations);

    if (this.isLocal) {
      this.initListeners();
    }

    // Inicializar burbuja (pero no mostrarla aún)
    this.socialBubble = new SocialBubble();
    this.personaje.parent?.add(this.socialBubble.mesh); // Agregar a la escena (parent del model)
  }

  /* =========================
     ANIMACIONES
  ========================= */

  private initAnimations(clips: THREE.AnimationClip[]) {
    if (!clips || clips.length === 0) {
      console.warn('⚠️ No se recibieron animaciones para el personaje');
      return;
    }
    clips.forEach((clip) => {
      const name = clip.name.toLowerCase();
      this.actions[name] = this.mixer.clipAction(clip);
    });

    this.play('idle');
    this.mixer.update(0); // 🔥 ARRANQUE FORZADO: Evita T-pose al aparecer
  }

  play(name: AnimationName) {
    if (this.currentAnimationName === name) return;

    const next = this.actions[name];
    if (!next) return;

    this.currentAction?.fadeOut(0.3);

    next
      .reset()
      .fadeIn(0.3)
      .play();

    if (name === 'jump') {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    }

    this.currentAction = next;
    this.currentAnimationName = name;
  }

  /* =========================
     INPUT
  ========================= */

  private initListeners() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  disable() {
    this.enabled = false;
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      space: false,
    };
  }


  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!InputGate.enabled) return;
    this.setKey(e.key, true);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if(!InputGate.enabled) return;
    this.setKey(e.key, false);
  };

  private setKey(key: string, pressed: boolean) {
    const k = key.toLowerCase();

    if (k === ' ') {
      this.keys.space = pressed;
      if (pressed && !this.isJumping) {
        this.jump();
      }
      return;
    }

    if (k in this.keys) {
      (this.keys as any)[k] = pressed;
    }
  }

  private jump() {
    if (this.isJumping) return;
    this.isJumping = true;
    this.jumpVelocity = this.jumpForce;
    this.play('jump');
  }

  setSocialBubble(url: string) {
    if (!this.socialBubble) return;
    
    // Asegurarnos que está en la escena principal
    if (this.personaje.parent && !this.socialBubble.mesh.parent) {
        this.personaje.parent.add(this.socialBubble.mesh);
    }
    
    this.socialBubble.show(url);
  }

  update(delta: number) {
    this.mixer.update(delta);
    if (!this.enabled) return;       // ⬅️ CLAVE
    if (!InputGate.enabled && this.isLocal) return; // ⛔ Solo bloquea local


    if (!this.isLocal) return;

    // rotación
    if (this.keys.a) {
      this.personaje.rotation.y += this.rotationSpeed * delta;
    }
    if (this.keys.d) {
      this.personaje.rotation.y -= this.rotationSpeed * delta;
    }

    // animaciones
    if (!this.isJumping) {
      if (this.keys.w) this.play('walk');
      else if (this.keys.s) this.play('back');
      else this.play('idle');
    }

    // movimiento adelante / atrás
    let dir = 0;
    if (this.keys.w) dir = 1;
    if (this.keys.s) dir = -1;

    if (dir !== 0) {
      this.tempVector.set(0, 0, 1);
      this.tempVector.applyQuaternion(this.personaje.quaternion);
      this.tempVector.y = 0;
      this.tempVector.normalize();
      // Multiplicar por delta para independencia de FPS
      this.tempVector.multiplyScalar(this.speed * dir * delta);
      this.personaje.position.add(this.tempVector);
    }

    // -------------------------------------------------------------------------
    // 🧱 LÍMITES DEL MAPA (MUROS INVISIBLES)
    // -------------------------------------------------------------------------
    const mapLimit = 40; // El suelo mide 80frenamos un poco antes
    this.personaje.position.x = Math.max(-mapLimit, Math.min(mapLimit, this.personaje.position.x));
    this.personaje.position.z = Math.max(-mapLimit, Math.min(mapLimit, this.personaje.position.z));
    // -------------------------------------------------------------------------

    // salto + gravedad
    if (this.isJumping) {
      this.personaje.position.y += this.jumpVelocity * delta;
      this.jumpVelocity += this.gravity * delta;

      if (this.personaje.position.y <= 0) {
        this.personaje.position.y = 0;
        this.isJumping = false;
        this.play(this.keys.w ? 'walk' : 'idle');
      }
    }

    // Actualizar burbuja social
    if (this.socialBubble && this.personaje.parent) {
      // Necesitamos acceso a la cámara. Como el controlador no la tiene, 
      // la pasaremos desde el update global o usaremos una referencia global de Three.
      // Opción B: Si no hay cámara, solo actualizamos posición y MainScenario maneja el lookAt.
      this.socialBubble.mesh.position.set(
        this.personaje.position.x,
        this.personaje.position.y + 11,
        this.personaje.position.z
      );
    }
  } 
}
