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

  role = computed(() => this._role());
  isGuest = computed(() => this._role() === 'guest');
  /** Nombre del usuario leído del token (null si es invitado). */
  username = computed(() => this._username());

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
    this._username.set(this.readUsername(token));

    this.socketService.disconnect();
    this.socketService.connect(token); // ✅ player
  }

  logout() {
  const socket = this.socketService.getSocket();

  socket.emit('logout'); // avisamos al server

  localStorage.clear();
  this._role.set('guest');
  this._username.set(null);

  // ❌ NO reconectar
}


  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private loadFromStorage() {
    const role = localStorage.getItem(this.roleKey) as Role | null;
    if (role) this._role.set(role);
    const token = this.getToken();
    if (token) this._username.set(this.readUsername(token));
  }

  /**
   * Lee el campo `username` del payload del JWT. Solo sirve para mostrarlo en la
   * interfaz: no valida la firma (eso lo hace el backend en cada petición).
   */
  private readUsername(token: string): string | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return typeof payload.username === 'string' ? payload.username : null;
    } catch {
      return null;
    }
  }
}
