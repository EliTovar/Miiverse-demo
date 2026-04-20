import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnInit,
  AfterViewInit,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MiiverseApiService, MiiversePost } from '../../services/miiverse-api.service';
import { SocialMediaServicie } from '../../services/social-media.service';
import { ComposerService } from '../../services/composer.service';

@Component({
  selector: 'app-miiverse-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './miiverse-feed.html',
  styleUrl: './miiverse-feed.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiiverseFeed implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(MiiverseApiService);
  private auth = inject(SocialMediaServicie);
  private cdr = inject(ChangeDetectorRef);
  private composerService = inject(ComposerService);

  @ViewChild('scrollAnchor') scrollAnchor?: ElementRef;
  @ViewChild('scrollContainer') scrollContainer?: ElementRef;
  private observer?: IntersectionObserver;

  posts = signal<MiiversePost[]>([]);
  loading = signal(true);
  page = 1;
  hasMore = true;
  loadingMore = false;

  get isGuest() { return this.auth.isGuest(); }

  ngOnInit() {
    this.loadFeed();
    this.setupComposerListener();
  }

  ngAfterViewInit() {
    this.initInfiniteScroll();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private initInfiniteScroll() {
    if (typeof IntersectionObserver === 'undefined') return;

    // 💡 Usamos el contenedor .mv-feed como root para mayor precisión en scroll anidado
    const options: IntersectionObserverInit = {
      root: this.scrollContainer?.nativeElement || null,
      rootMargin: '400px', // Aumentamos el margen para una carga más fluida
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && this.hasMore && !this.loadingMore && !this.loading()) {
        this.loadMore();
      }
    }, options);

    if (this.scrollAnchor) {
      this.observer.observe(this.scrollAnchor.nativeElement);
    }
  }

  setupComposerListener() {
    this.composerService.postCreated.subscribe((newPost) => {
      this.posts.update(ps => [newPost, ...ps]);
      this.cdr.markForCheck();
    });
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
  openComposer() {
    this.composerService.open();
  }

}
