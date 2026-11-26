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
  /** Avisan a la página para que actualice el contador del post. */
  commentAdded = output<MiiverseComment>();
  commentRemoved = output<MiiverseComment>();

  readonly maxLength = MAX_LENGTH;
  comments = signal<MiiverseComment[]>([]);
  loading = signal(true);
  loadError = signal(false);

  text = signal('');
  isSpoiler = signal(false);
  sending = signal(false);
  sendError = signal('');

  /** Comentario que se está editando (solo uno a la vez). */
  editingId = signal<number | null>(null);
  editText = signal('');
  editSpoiler = signal(false);
  saving = signal(false);
  /** Error de la última acción sobre un comentario concreto (editar, borrar, Yeah). */
  actionError = signal<{ id: number; message: string } | null>(null);
  /** Ids con una petición de Yeah en curso, para evitar dobles clics. */
  private yeahPending = new Set<number>();

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

  /** Solo el autor ve Editar (el backend lo vuelve a comprobar). */
  isMine(comment: MiiverseComment): boolean {
    const me = this.auth.userId();
    return me !== null && comment.user_id === me;
  }

  /** Borrar: el autor o un administrador (moderación). */
  canDelete(comment: MiiverseComment): boolean {
    return this.isMine(comment) || this.auth.role() === 'admin';
  }

  // ── Editar ──────────────────────────────────────────────────────────────
  startEdit(comment: MiiverseComment) {
    this.editingId.set(comment.id);
    this.editText.set(comment.content_text);
    this.editSpoiler.set(comment.is_spoiler);
    this.actionError.set(null);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(comment: MiiverseComment) {
    const content = this.editText().trim();
    if (!content || this.saving()) return;
    this.saving.set(true);
    this.api.updateComment(comment.id, { content_text: content, is_spoiler: this.editSpoiler() }).subscribe({
      next: updated => {
        this.replace(updated);
        this.editingId.set(null);
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.fail(comment.id, err, 'No se pudo guardar el comentario');
        this.saving.set(false);
      },
    });
  }

  // ── Borrar ──────────────────────────────────────────────────────────────
  remove(comment: MiiverseComment) {
    const question = this.isMine(comment)
      ? '¿Borrar este comentario? No se puede deshacer.'
      : `Moderación: ¿borrar el comentario de ${comment.username}? No se puede deshacer.`;
    if (!confirm(question)) return;
    this.api.deleteComment(comment.id).subscribe({
      next: () => {
        this.comments.update(list => list.filter(c => c.id !== comment.id));
        this.commentRemoved.emit(comment);
      },
      error: (err: HttpErrorResponse) => this.fail(comment.id, err, 'No se pudo borrar el comentario'),
    });
  }

  // ── Yeah ────────────────────────────────────────────────────────────────
  toggleYeah(comment: MiiverseComment) {
    if (this.auth.isGuest() || this.yeahPending.has(comment.id)) return;
    this.yeahPending.add(comment.id);
    this.api.toggleCommentYeah(comment.id).subscribe({
      next: ({ yeahs, yeahed }) => {
        this.replace({ ...this.find(comment.id) ?? comment, yeahs, yeahed });
        this.yeahPending.delete(comment.id);
      },
      error: (err: HttpErrorResponse) => {
        this.fail(comment.id, err, 'No se pudo dar Yeah');
        this.yeahPending.delete(comment.id);
      },
    });
  }

  private find(id: number) {
    return this.comments().find(c => c.id === id);
  }

  private replace(updated: MiiverseComment) {
    this.comments.update(list => list.map(c => (c.id === updated.id ? updated : c)));
  }

  private fail(id: number, err: HttpErrorResponse, fallback: string) {
    this.actionError.set({ id, message: err.error?.message ?? fallback });
  }

  fullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
