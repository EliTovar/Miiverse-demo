import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { MiiverseApiService } from '../../services/miiverse-api.service';
import { MiiverseModerationItem, ModerationFilters } from '../../models/miiverse.models';

const PAGE_SIZE = 30;

const EMPTY_FILTERS: ModerationFilters = {
  type: 'all', q: '', user: '', community: '', date: '', month: '', hour: '',
};

/**
 * Moderación (solo admin), en vista dividida:
 *  - Izquierda: filtros (tipo, texto, usuario, comunidad, día, mes, hora) y la
 *    lista de posts y comentarios, del más nuevo al más viejo.
 *  - Derecha: el elemento seleccionado completo, con su contexto y el botón
 *    para borrarlo.
 * La ruta la protege AuthGuard (rol admin) y el backend vuelve a comprobarlo.
 */
@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './moderation.html',
  styleUrl: './moderation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Moderation implements OnInit {
  private api = inject(MiiverseApiService);

  readonly hours = Array.from({ length: 24 }, (_, h) => h);
  /** Zona horaria en la que se interpretan día, mes y hora. */
  readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  filters: ModerationFilters = { ...EMPTY_FILTERS };
  items = signal<MiiverseModerationItem[]>([]);
  total = signal(0);
  loading = signal(false);
  error = signal('');
  selectedKey = signal<string | null>(null);
  deleting = signal(false);
  private page = 1;
  /** Copia de los filtros con los que se hizo la búsqueda (para "Ver más"). */
  private applied: ModerationFilters = { ...EMPTY_FILTERS };

  selected = computed(() => this.items().find(i => this.key(i) === this.selectedKey()) ?? null);
  hasMore = computed(() => this.items().length < this.total());

  ngOnInit() {
    this.search();
  }

  key(item: MiiverseModerationItem): string {
    return `${item.kind}-${item.id}`;
  }

  search() {
    this.applied = { ...this.filters };
    this.selectedKey.set(null);
    this.load(1);
  }

  clear() {
    this.filters = { ...EMPTY_FILTERS };
    this.search();
  }

  loadMore() {
    this.load(this.page + 1);
  }

  select(item: MiiverseModerationItem) {
    this.selectedKey.set(this.key(item));
  }

  private load(page: number) {
    this.loading.set(true);
    this.error.set('');
    this.api.getModerationItems(this.applied, page, PAGE_SIZE).subscribe({
      next: list => {
        this.page = page;
        this.items.update(current => (page === 1 ? list : [...current, ...list]));
        this.total.set(list[0]?.total ?? (page === 1 ? 0 : this.total()));
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.status === 403 ? 'Tu sesión no tiene permisos de administrador.'
            : err.status === 400 ? (err.error?.message ?? 'Algún filtro no es válido.')
            : 'No se pudo cargar la moderación.',
        );
        this.loading.set(false);
      },
    });
  }

  remove(item: MiiverseModerationItem) {
    const question = item.kind === 'post'
      ? `¿Borrar la publicación de ${item.username}${item.comments_count ? ` y sus ${item.comments_count} comentario(s)` : ''}? No se puede deshacer.`
      : `¿Borrar el comentario de ${item.username}? No se puede deshacer.`;
    if (!confirm(question)) return;

    this.deleting.set(true);
    const request: Observable<unknown> =
      item.kind === 'post' ? this.api.deletePost(item.id) : this.api.deleteComment(item.id);
    request.subscribe({
      next: () => {
        // Si se borra un post, también desaparecen de la lista sus comentarios.
        const gone = (i: MiiverseModerationItem) =>
          this.key(i) === this.key(item) || (item.kind === 'post' && i.kind === 'comment' && i.post_id === item.id);
        const removed = this.items().filter(gone).length;
        this.items.update(list => list.filter(i => !gone(i)));
        this.total.update(t => Math.max(0, t - removed));
        this.selectedKey.set(null);
        this.deleting.set(false);
      },
      error: (err: HttpErrorResponse) => {
        alert(err.error?.message ?? 'No se pudo borrar');
        this.deleting.set(false);
      },
    });
  }

  fullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }

  /** Texto corto para la lista. */
  preview(item: MiiverseModerationItem): string {
    if (item.content_text) return item.content_text;
    if (item.drawing_url) return '(dibujo)';
    if (item.screenshot_url) return '(captura)';
    return '(sin texto)';
  }
}
