import { ChangeDetectionStrategy, Component, effect, input, signal, untracked } from '@angular/core';
import { Observable } from 'rxjs';
import { MiiversePost, PostSort } from '../../../models/miiverse.models';
import { PostItem } from '../post-item/post-item';

/** Función que trae una página de posts; la pone la página que usa la lista. */
export type FetchPostsPage = (sort: PostSort, page: number) => Observable<MiiversePost[]>;

export interface SortOption {
  value: PostSort;
  label: string;
}

const PAGE_SIZE = 20;

/**
 * Lista paginada de posts con pestañas de orden y botón "Ver más".
 * La usan la página de comunidad y la de perfil.
 */
@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [PostItem],
  template: `
    <div class="mv-tabs" role="tablist">
      @for (option of sorts(); track option.value) {
        <button type="button" role="tab"
                [class.active]="sort() === option.value"
                [attr.aria-selected]="sort() === option.value"
                (click)="changeSort(option.value)">{{ option.label }}</button>
      }
    </div>

    @if (loading() && posts().length === 0) {
      @for (n of [1, 2, 3]; track n) {
        <div class="mv-skeleton">
          <div class="sk-avatar"></div>
          <div class="sk-lines">
            <div class="sk-line sk-short"></div>
            <div class="sk-line sk-long"></div>
          </div>
        </div>
      }
    } @else if (error()) {
      <div class="mv-status">No se pudieron cargar las publicaciones.</div>
    } @else {
      @for (post of posts(); track post.id) {
        <app-post-item [post]="post" />
      } @empty {
        <div class="mv-status">No hay publicaciones.</div>
      }

      @if (hasMore()) {
        <button type="button" class="mv-more-btn" [disabled]="loading()" (click)="loadMore()">
          {{ loading() ? 'Cargando...' : 'Ver más' }}
        </button>
      }
    }
  `,
  styles: [`:host { display: block; }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostList {
  fetchPage = input.required<FetchPostsPage>();
  sorts = input<SortOption[]>([
    { value: 'recent', label: 'Recientes' },
    { value: 'popular', label: 'Populares' },
  ]);

  sort = signal<PostSort>('recent');
  posts = signal<MiiversePost[]>([]);
  loading = signal(false);
  error = signal(false);
  hasMore = signal(false);
  private page = 1;

  constructor() {
    // Cuando cambia la función (otra comunidad u otro usuario) se empieza de cero.
    effect(() => {
      this.fetchPage();
      untracked(() => this.reset());
    });
  }

  changeSort(sort: PostSort) {
    if (sort === this.sort()) return;
    this.sort.set(sort);
    this.reset();
  }

  loadMore() {
    this.load(this.page + 1);
  }

  private reset() {
    this.posts.set([]);
    this.load(1);
  }

  private load(page: number) {
    this.loading.set(true);
    this.error.set(false);
    const sortAtRequest = this.sort();
    this.fetchPage()(sortAtRequest, page).subscribe({
      next: newPosts => {
        // Si el usuario cambió de pestaña mientras tanto, se ignora la respuesta vieja.
        if (sortAtRequest !== this.sort()) return;
        this.page = page;
        this.posts.update(current => (page === 1 ? newPosts : [...current, ...newPosts]));
        this.hasMore.set(newPosts.length === PAGE_SIZE);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
