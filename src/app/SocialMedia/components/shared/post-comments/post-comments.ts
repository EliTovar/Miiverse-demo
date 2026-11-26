import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MiiverseApiService, MiiverseComment } from '../../../services/miiverse-api.service';
import { SocialMediaServicie } from '../../../services/social-media.service';
import { Spoiler } from '../spoiler/spoiler';

const MAX_LENGTH = 500;

/**
 * Sección "Comentarios" de la página de un post (como en Archiverse):
 * lista de comentarios y, con sesión, un formulario para comentar.
 */
@Component({
  selector: 'app-post-comments',
  standalone: true,
  imports: [FormsModule, RouterLink, Spoiler],
  templateUrl: './post-comments.html',
  styleUrl: './post-comments.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostComments {
  private api = inject(MiiverseApiService);
  auth = inject(SocialMediaServicie);

  postId = input.required<number>();
  /** Autor del post: sus comentarios se resaltan. */
  postAuthor = input.required<string>();
  /** Avisa a la página para que actualice el contador del post. */
  commentAdded = output<MiiverseComment>();

  readonly maxLength = MAX_LENGTH;
  comments = signal<MiiverseComment[]>([]);
  loading = signal(true);
  loadError = signal(false);

  text = signal('');
  isSpoiler = signal(false);
  sending = signal(false);
  sendError = signal('');

  constructor() {
    effect(() => {
      const id = this.postId();
      untracked(() => this.load(id));
    });
  }

  private load(postId: number) {
    this.loading.set(true);
    this.loadError.set(false);
    this.api.getComments(postId).subscribe({
      next: list => { this.comments.set(list); this.loading.set(false); },
      error: () => { this.loadError.set(true); this.loading.set(false); },
    });
  }

  send() {
    const content = this.text().trim();
    if (!content || this.sending()) return;
    this.sending.set(true);
    this.sendError.set('');
    this.api.createComment(this.postId(), { content_text: content, is_spoiler: this.isSpoiler() }).subscribe({
      next: comment => {
        this.comments.update(list => [...list, comment]);
        this.commentAdded.emit(comment);
        this.text.set('');
        this.isSpoiler.set(false);
        this.sending.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.sendError.set(err.error?.message ?? 'No se pudo publicar el comentario');
        this.sending.set(false);
      },
    });
  }

  fullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
