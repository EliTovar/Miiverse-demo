import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MiiverseApiService, MiiversePost } from '../../services/miiverse-api.service';
import { SocialMediaServicie } from '../../services/social-media.service';

@Component({
  selector: 'app-miiverse-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './miiverse-feed.html',
  styleUrl: './miiverse-feed.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiiverseFeed implements OnInit {
  @ViewChild('drawingCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private api = inject(MiiverseApiService);
  private auth = inject(SocialMediaServicie);
  private cdr = inject(ChangeDetectorRef);

  posts = signal<MiiversePost[]>([]);
  loading = signal(true);
  page = 1;
  hasMore = true;
  loadingMore = false;

  // Composer state
  composerText = '';
  composerGame = '';
  composerMode: 'text' | 'draw' = 'text';
  isPosting = false;
  showComposer = false;

  // Canvas drawing
  private ctx!: CanvasRenderingContext2D;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;
  drawColor = '#1a1a2e';
  drawSize = 4;

  get isGuest() { return this.auth.isGuest(); }

  ngOnInit() {
    this.loadFeed();
  }

  loadFeed() {
    this.loading.set(true);
    this.api.getFeed(1, 20).subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.page = 1;
        this.hasMore = posts.length === 20;
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  loadMore() {
    if (this.loadingMore || !this.hasMore) return;
    this.loadingMore = true;
    this.page++;
    this.api.getFeed(this.page, 20).subscribe({
      next: (newPosts) => {
        this.posts.update(p => [...p, ...newPosts]);
        this.hasMore = newPosts.length === 20;
        this.loadingMore = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingMore = false; }
    });
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `hace ${days} día${days > 1 ? 's' : ''}`;
    return new Date(dateStr).toLocaleDateString('es-MX');
  }

  toggleYeah(post: MiiversePost) {
    if (this.isGuest) return;
    this.api.toggleYeah(post.id).subscribe({
      next: ({ yeahs }) => {
        this.posts.update(ps =>
          ps.map(p => p.id === post.id ? { ...p, yeahs } : p)
        );
        this.cdr.markForCheck();
      }
    });
  }

  // ── Composer ────────────────────────────────────────────────────────────────
  openComposer() { this.showComposer = true; }
  closeComposer() { this.showComposer = false; this.composerText = ''; this.composerGame = ''; }

  setMode(mode: 'text' | 'draw') {
    this.composerMode = mode;
    if (mode === 'draw') {
      setTimeout(() => this.initCanvas(), 50);
    }
  }

  submitPost() {
    const drawingUrl = this.composerMode === 'draw' ? this.getCanvasDataUrl() : undefined;
    if (!this.composerText.trim() && !drawingUrl) return;
    this.isPosting = true;

    this.api.createPost({
      content_text: this.composerText || undefined,
      drawing_url: drawingUrl,
      game_title: this.composerGame || undefined,
    }).subscribe({
      next: (post) => {
        this.posts.update(ps => [post, ...ps]);
        this.isPosting = false;
        this.closeComposer();
        this.cdr.markForCheck();
      },
      error: () => { this.isPosting = false; }
    });
  }

  // ── Canvas drawing ───────────────────────────────────────────────────────
  private initCanvas() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    canvas.addEventListener('mousemove', (e) => this.draw(e));
    canvas.addEventListener('mouseup', () => this.drawing = false);
    canvas.addEventListener('mouseleave', () => this.drawing = false);

    // Touch support
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.startDraw(e.touches[0] as any); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.draw(e.touches[0] as any); });
    canvas.addEventListener('touchend', () => this.drawing = false);
  }

  private startDraw(e: MouseEvent) {
    this.drawing = true;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;
  }

  private draw(e: MouseEvent) {
    if (!this.drawing || !this.ctx) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
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

  clearCanvas() {
    if (!this.ctx || !this.canvasRef) return;
    const c = this.canvasRef.nativeElement;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, c.width, c.height);
  }

  private getCanvasDataUrl(): string | undefined {
    return this.canvasRef?.nativeElement?.toDataURL('image/png');
  }
}
