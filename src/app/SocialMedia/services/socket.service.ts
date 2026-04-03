import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket?: Socket;

  connect(token?: string): void {
    if (this.socket) return; // ⛔ CLAVE

    this.socket = io('http://192.168.100.15:3000', {
      transports: ['websocket'],
      auth: token ? { token } : undefined, // 👈 opcional
    });

    this.socket.on('connect', () => {
      console.log('🟢 Socket conectado:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 Socket desconectado');
    });

    this.socket.on('connect_error', (err) => {
      console.error('❌ Error de conexión socket:', err.message);
    });
  }

  getSocket(): Socket {
    if (!this.socket) throw new Error('Socket no conectado');
    return this.socket;
  }

  authenticate(token: string): void {
    if (!this.socket) {
      this.connect(token);
      return;
    }
    this.socket.emit('authenticate', { token });
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.emit('logout');
    this.socket.disconnect();
    this.socket = undefined;
  }
}
