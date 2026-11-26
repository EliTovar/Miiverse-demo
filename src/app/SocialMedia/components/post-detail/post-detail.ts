import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MiiverseApiService, MiiversePost } from '../../services/miiverse-api.service';
import { CommunityIcon } from '../shared/community-icon/community-icon';
import { PostItem } from '../shared/post-item/post-item';
import { PostComments } from '../shared/post-comments/post-comments';

/** Página de un post: la comunidad arriba y el post completo. */
@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [RouterLink, CommunityIcon, PostItem, PostComments],
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetail {
  private api = inject(MiiverseApiService);

  post = signal<MiiversePost | null>(null);
  loading = signal(true);
  error = signal<'not-found' | 'other' | null>(null);

  constructor() {
    inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const id = Number(params.get('id'));
      this.post.set(null);
      this.error.set(null);
      if (!Number.isInteger(id) || id < 1) {
        this.error.set('not-found');
        this.loading.set(false);
        return;
      }
      this.loading.set(true);
      this.api.getPost(id).subscribe({
        next: post => {
          this.post.set(post);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(err.status === 404 ? 'not-found' : 'other');
          this.loading.set(false);
        },
      });
    });
  }

  /** Ajusta el contador de comentarios que muestra el post (+1 al comentar, -1 al borrar). */
  changeCommentCount(delta: number) {
    this.post.update(post => (post ? { ...post, comments_count: post.comments_count + delta } : post));
  }
}
