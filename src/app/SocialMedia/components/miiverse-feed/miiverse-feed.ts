import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnInit,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MiiverseApiService } from '../../services/miiverse-api.service';
import { MiiversePost } from '../../models/miiverse.models';
import { SocialMediaServicie } from '../../services/social-media.service';
import { ComposerService } from '../../services/composer.service';
import { PostItem } from '../shared/post-item/post-item';

@Component({
  selector: 'app-miiverse-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, PostItem],
  templateUrl: './miiverse-feed.html',
  styleUrl: './miiverse-feed.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiiverseFeed implements OnInit, OnDestroy {
  private api = inject(MiiverseApiService);
  private auth = inject(SocialMediaServicie);
  private cdr = inject(ChangeDetectorRef);
  private composerService = inject(ComposerService);

  private observer?: IntersectionObserver;

  /**
   * El ancla está dentro del bloque que solo se pinta cuando termina la carga
   * inicial, así que no existe en ngAfterViewInit. Con un setter la observamos
   * en cuanto Angular la crea.
   */
  @ViewChild('scrollAnchor') set scrollAnchor(anchor: ElementRef | undefined) {
    this.observer?.disconnect();
    if (anchor) this.observer?.observe(anchor.nativeElement);
  }

  posts = signal<MiiversePost[]>([]);
  loading = signal(true);
  page = 1;
  hasMore = true;
  loadingMore = false;

  get isGuest() { return this.auth.isGuest(); }

  ngOnInit() {
    this.initInfiniteScroll();
    this.loadFeed();
    this.setupComposerListener();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private initInfiniteScroll() {
    if (typeof IntersectionObserver === 'undefined') return;

    // root null = viewport. El observer tiene en cuenta el recorte del contenedor
    // con scroll del marco (.mv-shell), así que no hace falta referenciarlo.
    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '400px', // Aumentamos el margen para una carga más fluida
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && this.hasMore && !this.loadingMore && !this.loading()) {
        this.loadMore();
      }
    }, options);
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
}
