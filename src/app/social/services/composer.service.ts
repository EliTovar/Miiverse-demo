import { Injectable, signal, EventEmitter } from '@angular/core';

export type ComposerMode = 'text' | 'draw' | 'draw-only';

export interface ComposerConfig {
  mode?: ComposerMode;
  gameTitle?: string;
  initialText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComposerService {
  // Estado reactivo del modal
  isOpen = signal(false);
  mode = signal<ComposerMode>('text');
  gameTitle = signal<string>('');
  initialText = signal<string>('');

  // Evento para notificar cuando un post ha sido creado exitosamente
  postCreated = new EventEmitter<any>();

  open(config: ComposerConfig = {}) {
    this.mode.set(config.mode || 'text');
    this.gameTitle.set(config.gameTitle || '');
    this.initialText.set(config.initialText || '');
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.initialText.set('');
    this.gameTitle.set('');
  }

  notifyPostCreated(post: any) {
    this.postCreated.emit(post);
  }
}
