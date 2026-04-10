import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket?: Socket;

  connect(token?: string): void {
    if (this.socket?.connected) return; 

    if (this.socket) {
      console.log('🔄 Re-conectando socket existente...');
      this.socket.connect();
      return;
    }

    this.socket = io('http://localhost:3000', {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
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
  
    emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }

  getSocket(): Socket {
    if (!this.socket) throw new Error('Socket no conectado');
    return this.socket;
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.emit('logout');
    this.socket.disconnect();
    this.socket = undefined;
  }
  
}
