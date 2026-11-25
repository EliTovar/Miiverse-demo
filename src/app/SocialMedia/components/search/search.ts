import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MiiverseApiService, MiiverseCommunity, MiiverseUserSummary } from '../../services/miiverse-api.service';
import { CommunityIcon } from '../shared/community-icon/community-icon';

type SearchTab = 'users' | 'communities';

/**
 * Página "Buscar" como en Archiverse: una caja de texto y pestañas Usuarios /
 * Comunidades. El texto y la pestaña van en la URL (?q=&tab=) para poder
 * compartir o volver atrás a una búsqueda.
 */
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, RouterLink, CommunityIcon],
  templateUrl: './search.html',
  styleUrl: '../shared/result-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Search {
  private api = inject(MiiverseApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  query = '';
  tab = signal<SearchTab>('users');
  users = signal<MiiverseUserSummary[]>([]);
  communities = signal<MiiverseCommunity[]>([]);
  loading = signal(false);
  error = signal(false);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      this.query = params.get('q') ?? '';
      this.tab.set(params.get('tab') === 'communities' ? 'communities' : 'users');
      this.load();
    });
  }

  /** Cambia la URL; la suscripción de arriba hace la búsqueda. */
  submit(tab: SearchTab = this.tab()) {
    const q = this.query.trim();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: q || null, tab },
    });
  }

  private load() {
    this.loading.set(true);
    this.error.set(false);
    const done = { error: () => { this.error.set(true); this.loading.set(false); } };
    if (this.tab() === 'users') {
      this.api.searchUsers(this.query).subscribe({
        next: list => { this.users.set(list); this.loading.set(false); },
        ...done,
      });
    } else {
      this.api.getCommunities(this.query).subscribe({
        next: list => { this.communities.set(list); this.loading.set(false); },
        ...done,
      });
    }
  }
}
