import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ComposerService } from '../../../services/composer.service';
import { DrawingCanvasComponent } from '../drawing-canvas/drawing-canvas';
import { MiiverseApiService } from '../../../services/miiverse-api.service';

@Component({
  selector: 'app-composer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DrawingCanvasComponent],
  templateUrl: './composer-modal.html',
  styleUrl: './composer-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComposerModalComponent {
  service = inject(ComposerService);
  private api = inject(MiiverseApiService);

  @ViewChild('canvas') canvasComponent?: DrawingCanvasComponent;

  composerText = signal('');
  composerGame = signal('');
  composerSpoiler = signal(false);
  // Signals: con OnPush, cambiarlos desde la respuesta HTTP sí refresca la vista.
  isPosting = signal(false);
  postError = signal('');

  constructor() {
    // Sincronizar con el estado inicial del servicio
    this.composerText.set(this.service.initialText());
    this.composerGame.set(this.service.gameTitle());
  }

  close() {
    this.service.close();
    this.composerText.set('');
    this.composerGame.set('');
    this.composerSpoiler.set(false);
    this.postError.set('');
  }

  submitPost() {
    const drawingUrl = (this.service.mode() === 'draw' || this.service.mode() === 'draw-only') 
      ? this.canvasComponent?.getDataUrl() 
      : undefined;

    const text = this.composerText();
    
    if (!text.trim() && !drawingUrl) return;
    this.isPosting.set(true);
    this.postError.set('');

    this.api.createPost({
      content_text: text || undefined,
      drawing_url: drawingUrl,
      game_title: this.composerGame() || undefined,
      is_spoiler: this.composerSpoiler(),
    }).subscribe({
      next: (post) => {
        this.service.notifyPostCreated(post);
        this.isPosting.set(false);
        this.close();
      },
      error: (err: HttpErrorResponse) => {
        // El backend explica qué falló (texto demasiado largo, sin sesión…).
        this.postError.set(
          err.status === 401 ? 'Tu sesión caducó. Vuelve a iniciar sesión.'
            : err.status === 413 ? 'El dibujo es demasiado grande.'
            : err.error?.message ?? 'No se pudo publicar. Inténtalo de nuevo.',
        );
        this.isPosting.set(false);
      }
    });
  }
}
