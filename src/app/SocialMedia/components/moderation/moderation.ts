import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MiiverseAdminComment, MiiverseApiService } from '../../services/miiverse-api.service';

const PAGE_SIZE = 20;

/**
 * Moderación de comentarios (solo admin): lista todos los comentarios, del
 * más nuevo al más viejo, con buscador y botón para borrarlos.
 * La ruta la protege AuthGuard (rol admin) y el backend vuelve a comprobarlo.
 */
@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './moderation.html',
  styleUrls: ['../shared/result-list.css', './moderation.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Moderation implements OnInit {
  private api = inject(MiiverseApiService);

  search = '';
  comments = signal<MiiverseAdminComment[]>([]);
  loading = signal(false);
  error = signal('');
  hasMore = signal(false);
  /** Comentario cuyo borrado está en curso. */
  deletingId = signal<number | null>(null);
  private page = 1;
  private searchAtLoad = '';

  ngOnInit() {
    this.load(1);
  }

  submit() {
    this.load(1);
  }

  loadMore() {
    this.load(this.page + 1);
  }

  private load(page: number) {
    if (page === 1) this.searchAtLoad = this.search;
    this.loading.set(true);
    this.error.set('');
    this.api.getCommentsForModeration(this.searchAtLoad, page, PAGE_SIZE).subscribe({
      next: list => {
        this.page = page;
        this.comments.update(current => (page === 1 ? list : [...current, ...list]));
        this.hasMore.set(list.length === PAGE_SIZE);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 403 ? 'Tu sesión no tiene permisos de administrador.' : 'No se pudieron cargar los comentarios.');
        this.loading.set(false);
      },
    });
  }

  remove(comment: MiiverseAdminComment) {
    if (!confirm(`¿Borrar el comentario de ${comment.username}? No se puede deshacer.`)) return;
    this.deletingId.set(comment.id);
    this.api.deleteComment(comment.id).subscribe({
      next: () => {
        this.comments.update(list => list.filter(c => c.id !== comment.id));
        this.deletingId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        alert(err.error?.message ?? 'No se pudo borrar el comentario');
        this.deletingId.set(null);
      },
    });
  }

  fullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
