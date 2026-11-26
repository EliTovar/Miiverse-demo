import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MiiverseApiService } from '../../services/miiverse-api.service';
import { MiiversePost } from '../../models/miiverse.models';
import { AuthStateService } from '../../../core/auth/auth-state.service';
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
  private router = inject(Router);
  auth = inject(AuthStateService);
  deleting = signal(false);

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

  /** Moderación (solo admin): borra el post con sus comentarios y vuelve a Actividad. */
  deletePost(post: MiiversePost) {
    const extra = post.comments_count ? ` y sus ${post.comments_count} comentario(s)` : '';
    if (!confirm(`Moderación: ¿borrar la publicación de ${post.username}${extra}? No se puede deshacer.`)) return;
    this.deleting.set(true);
    this.api.deletePost(post.id).subscribe({
      next: () => this.router.navigate(['/social']),
      error: (err: HttpErrorResponse) => {
        alert(err.error?.message ?? 'No se pudo borrar la publicación');
        this.deleting.set(false);
      },
    });
  }

  /** Ajusta el contador de comentarios que muestra el post (+1 al comentar, -1 al borrar). */
  changeCommentCount(delta: number) {
    this.post.update(post => (post ? { ...post, comments_count: post.comments_count + delta } : post));
  }
}
