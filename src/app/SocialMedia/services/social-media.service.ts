import { computed, inject, Injectable, signal } from '@angular/core';
import { SocketService } from './socket.service';

export type Role = 'guest' | 'user' | 'admin';

@Injectable({ providedIn: 'root' })
export class SocialMediaServicie {
  private tokenKey = 'access_token';
  private roleKey = 'role';
  private socketService = inject(SocketService);

  private _role = signal<Role>('guest');
  private _username = signal<string | null>(null);
  private _userId = signal<number | null>(null);

  role = computed(() => this._role());
  isGuest = computed(() => this._role() === 'guest');
  /** Nombre del usuario leído del token (null si es invitado). */
  username = computed(() => this._username());
  /** Id del usuario leído del token (`sub`); null si es invitado. */
  userId = computed(() => this._userId());

  constructor() {
    this.loadFromStorage();
    this.initSocket();
  }

  private initSocket() {
    const token = this.getToken();
    this.socketService.connect(token ?? undefined);
  }

  login(token: string, role: Role) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.roleKey, role);
    this._role.set(role);
    this.setUserFromToken(token);

    this.socketService.disconnect();
    this.socketService.connect(token); // ✅ player
  }

  logout() {
  const socket = this.socketService.getSocket();

  socket.emit('logout'); // avisamos al server

  localStorage.clear();
  this._role.set('guest');
  this._username.set(null);
  this._userId.set(null);

  // ❌ NO reconectar
}


  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private loadFromStorage() {
    const role = localStorage.getItem(this.roleKey) as Role | null;
    if (role) this._role.set(role);
    const token = this.getToken();
    if (token) this.setUserFromToken(token);
  }

  /**
   * Lee `username` y `sub` (id) del payload del JWT. Solo sirven para la
   * interfaz (mostrar el nombre, saber qué comentarios son míos): no se valida
   * la firma porque el backend la comprueba en cada petición.
   */
  private setUserFromToken(token: string) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this._username.set(typeof payload.username === 'string' ? payload.username : null);
      this._userId.set(typeof payload.sub === 'number' ? payload.sub : null);
    } catch {
      this._username.set(null);
      this._userId.set(null);
    }
  }
}
