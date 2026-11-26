import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-drawing-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mv-canvas-container">
      <div class="mv-canvas-wrap">
        <canvas #drawingCanvas class="mv-canvas"></canvas>
      </div>

      <div class="mv-draw-tools">
        <div class="mv-color-group">
          @for (color of colors; track color) {
            <button
              class="mv-color-dot"
              [style.background]="color"
              [class.selected]="drawColor === color"
              (click)="drawColor = color"
            ></button>
          }
        </div>

        <div class="mv-size-group">
          <label>Grosor</label>
          <input type="range" min="1" max="24" [(ngModel)]="drawSize" />
        </div>

        <button class="mv-btn-action" (click)="clear()">
          <span>🗑️</span> Borrar todo
        </button>
      </div>
    </div>
  `,
  styles: [`
    .mv-canvas-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      width: 100%;
    }

    .mv-canvas-wrap {
      background: #fdfdfd;
      border: 3px solid #1a1a1a;
      border-radius: 12px;
      aspect-ratio: 320 / 120; /* Proporción clásica Miiverse */
      width: 100%;
      cursor: crosshair;
      overflow: hidden;
      box-shadow: inset 0 4px 12px rgba(0,0,0,0.1);
      touch-action: none;
    }

    .mv-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    .mv-draw-tools {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      background: rgba(0,0,0,0.03);
      border-radius: 16px;
    }

    .mv-color-group {
      display: flex;
      gap: 8px;
    }

    .mv-color-dot {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      cursor: var(--mv-cursor-hand);
      transition: transform 0.2s;
    }

    .mv-color-dot:hover { transform: scale(1.2); }
    .mv-color-dot.selected { outline: 3px solid #3498db; }

    .mv-size-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 150px;
    }

    .mv-size-group label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #444;
    }

    .mv-size-group input { width: 100%; }

    .mv-btn-action {
      padding: 8px 16px;
      border: none;
      background: #eee;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: var(--mv-cursor-hand);
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .mv-btn-action:hover { background: #e0e0e0; }
  `]
})
export class DrawingCanvasComponent implements AfterViewInit {
  @ViewChild('drawingCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() drawColor = '#1a1a2e';
  @Input() drawSize = 4;

  colors = ['#1a1a2e', '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#ffffff'];

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;

  ngAfterViewInit() {
    this.initCanvas();
  }

  private initCanvas() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    this.ctx = canvas.getContext('2d')!;

    // Background blanco inicial
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Desktop
    canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    canvas.addEventListener('mousemove', (e) => this.draw(e));
    canvas.addEventListener('mouseup', () => this.drawing = false);
    canvas.addEventListener('mouseleave', () => this.drawing = false);

    // Mobile
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDraw(e.touches[0] as any);
    });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.draw(e.touches[0] as any);
    });
    canvas.addEventListener('touchend', () => this.drawing = false);
  }

  private startDraw(e: MouseEvent) {
    this.drawing = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;
  }

  private draw(e: MouseEvent) {
    if (!this.drawing || !this.ctx) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.ctx.beginPath();
    this.ctx.strokeStyle = this.drawColor;
    this.ctx.lineWidth = this.drawSize;
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
  }

  clear() {
    if (!this.ctx) return;
    const c = this.canvasRef.nativeElement;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, c.width, c.height);
  }

  getDataUrl(): string {
    return this.canvasRef.nativeElement.toDataURL('image/png');
  }
}
