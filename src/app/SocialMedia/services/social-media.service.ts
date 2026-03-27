import { computed, inject, Injectable, signal } from '@angular/core';
import { SocketService } from './socket.service';

export type Role = 'guest' | 'user' | 'admin';

@Injectable({ providedIn: 'root' })
export class SocialMediaServicie {
  private tokenKey = 'access_token';
  private roleKey = 'role';
  private socketService = inject(SocketService);

  private _role = signal<Role>('guest');

  role = computed(() => this._role());
  isGuest = computed(() => this._role() === 'guest');

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

    this.socketService.disconnect();
    this.socketService.connect(token); // ✅ player
  }

  logout() {
  const socket = this.socketService.getSocket();

  socket.emit('logout'); // avisamos al server

  localStorage.clear();
  this._role.set('guest');

  // ❌ NO reconectar
}


  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private loadFromStorage() {
    const role = localStorage.getItem(this.roleKey) as Role | null;
    if (role) this._role.set(role);
  }
}
