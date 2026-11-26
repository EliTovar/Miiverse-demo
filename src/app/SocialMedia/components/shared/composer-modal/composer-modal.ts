import {
  Component,
  inject,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComposerService } from '../../../services/composer.service';
import { DrawingCanvasComponent } from '../drawing-canvas/drawing-canvas';
import { MiiverseApiService } from '../../../services/miiverse-api.service';

@Component({
  selector: 'app-composer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DrawingCanvasComponent],
  template: `
    @if (service.isOpen()) {
      <div class="mv-overlay" (click)="close()"></div>
      <div class="mv-composer" [class.draw-only]="service.mode() === 'draw-only'">
        <div class="mv-composer-header">
          <h3>{{ service.mode() === 'draw-only' ? 'Nuevo dibujo' : 'Nueva publicación' }}</h3>
          <button class="mv-close-btn" (click)="close()">✕</button>
        </div>

        <!-- Mode tabs (ocultas si es draw-only) -->
        @if (service.mode() !== 'draw-only') {
          <div class="mv-tabs">
            <button class="mv-tab" [class.active]="service.mode() === 'text'" (click)="service.mode.set('text')">
              💬 Texto
            </button>
            <button class="mv-tab" [class.active]="service.mode() === 'draw'" (click)="service.mode.set('draw')">
              🎨 Dibujar
            </button>
          </div>
        }

        <div class="mv-composer-content">
          @if (service.mode() === 'text') {
            <textarea
              class="mv-textarea"
              [(ngModel)]="composerText"
              placeholder="¿Qué está pasando en tu aventura?"
              maxlength="500"
              rows="5"
            ></textarea>
            <div class="mv-char-count">{{ composerText().length }}/500</div>
          } @else {
            <app-drawing-canvas #canvas></app-drawing-canvas>
          }
        </div>

        <div class="mv-composer-form">
          <input
            class="mv-game-input"
            [(ngModel)]="composerGame"
            placeholder="🎮 Comunidad / Juego (opcional)"
          />

          <label class="mv-spoiler-check">
            <input type="checkbox" [(ngModel)]="composerSpoiler" />
            Contiene spoilers
          </label>

          <div class="mv-composer-footer">
            <button class="mv-btn mv-btn-ghost" (click)="close()">Cancelar</button>
            <button
              class="mv-btn mv-btn-primary"
              [disabled]="isPosting"
              (click)="submitPost()"
            >
              {{ isPosting ? 'Publicando…' : 'Publicar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .mv-overlay {
      position: fixed;
      inset: 0;
      background: rgba(40, 40, 40, 0.45);
      backdrop-filter: blur(2px);
      z-index: 2000;
      animation: fadeIn 0.3s ease-out;
    }

    .mv-composer {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 600px;
      background: white;
      border-radius: 16px;
      z-index: 2001;
      font-family: var(--mv-font);
      color: var(--mv-text);
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      border: 1px solid var(--mv-border);
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .mv-composer.draw-only {
      max-width: 800px; /* Más espacio para dibujar */
    }

    .mv-composer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid #eee;
    }

    .mv-composer-header h3 {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--mv-text);
    }

    .mv-close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: #999;
      cursor: pointer;
      padding: 4px;
    }

    .mv-tabs {
      display: flex;
      gap: 12px;
      background: #f5f5f7;
      padding: 6px;
      border-radius: 12px;
    }

    .mv-tab {
      flex: 1;
      padding: 10px;
      border: none;
      background: transparent;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      color: #666;
      transition: all 0.2s;
    }

    .mv-tab.active {
      background: white;
      color: var(--mv-green-dark);
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }

    .mv-composer-content {
      flex: 1;
      min-height: 200px;
    }

    .mv-textarea {
      width: 100%;
      aspect-ratio: 320 / 120; /* Proporción idéntica al dibujo */
      border: 3px solid #1a1a1a;
      border-radius: 12px;
      resize: none;
      font-size: 1.1rem;
      color: #333;
      padding: 14px;
      font-family: inherit;
      box-sizing: border-box;
    }

    .mv-textarea:focus { outline: none; }

    .mv-char-count {
      text-align: right;
      font-size: 0.8rem;
      color: #999;
      margin-top: 8px;
    }

    .mv-game-input {
      width: 100%;
      padding: 12px 16px;
      background: #f8f9fa;
      border: 2px solid #edeff2;
      border-radius: 12px;
      font-size: 0.95rem;
      margin-top: 1rem;
      color: #111; /* Texto negro */
      transition: all 0.2s;
    }

    .mv-game-input:focus {
      border-color: var(--mv-green);
      background: white;
      outline: none;
    }

    .mv-spoiler-check {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font-size: 0.95rem;
      font-weight: 700;
      color: #666;
      cursor: pointer;
    }
    .mv-spoiler-check input { accent-color: var(--mv-orange); width: 16px; height: 16px; }

    .mv-composer-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .mv-btn {
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 800;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 1rem;
    }

    .mv-btn-ghost {
      background: #f5f5f7;
      color: #666;
      border: none;
    }

    .mv-btn-ghost:hover { background: #edeff2; }

    .mv-btn-primary {
      background: linear-gradient(180deg, var(--mv-green-light) 0%, var(--mv-green) 100%);
      color: white;
      border: 1px solid var(--mv-green-dark);
      text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
    }

    .mv-btn-primary:hover:not(:disabled) {
      filter: brightness(1.05);
      transform: translateY(-1px);
    }

    .mv-btn-primary:disabled { opacity: 0.6; cursor: wait; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { 
      from { opacity: 0; transform: translate(-50%, -40%); } 
      to { opacity: 1; transform: translate(-50%, -50%); } 
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComposerModalComponent {
  service = inject(ComposerService);
  private api = inject(MiiverseApiService);

  @ViewChild('canvas') canvasComponent?: DrawingCanvasComponent;

  composerText = signal('');
  composerGame = signal('');
  composerSpoiler = signal(false);
  isPosting = false;

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
  }

  submitPost() {
    const drawingUrl = (this.service.mode() === 'draw' || this.service.mode() === 'draw-only') 
      ? this.canvasComponent?.getDataUrl() 
      : undefined;

    const text = this.composerText();
    
    if (!text.trim() && !drawingUrl) return;
    this.isPosting = true;

    this.api.createPost({
      content_text: text || undefined,
      drawing_url: drawingUrl,
      game_title: this.composerGame() || undefined,
      is_spoiler: this.composerSpoiler(),
    }).subscribe({
      next: (post) => {
        this.service.notifyPostCreated(post);
        this.isPosting = false;
        this.close();
      },
      error: () => {
        this.isPosting = false;
      }
    });
  }
}
