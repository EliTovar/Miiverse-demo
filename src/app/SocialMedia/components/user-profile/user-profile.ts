import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, tap, throwError } from 'rxjs';
import { MiiverseApiService, MiiverseUserProfile } from '../../services/miiverse-api.service';
import { FetchPostsPage, PostList, SortOption } from '../shared/post-list/post-list';

/** Perfil público de un usuario: cabecera, contadores y sus posts. */
@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [RouterLink, PostList],
  templateUrl: './user-profile.html',
  styleUrl: '../shared/page-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfile {
  private api = inject(MiiverseApiService);

  readonly sorts: SortOption[] = [
    { value: 'recent', label: 'Recientes' },
    { value: 'oldest', label: 'Antiguos' },
    { value: 'popular', label: 'Populares' },
  ];

  username = signal('');
  profile = signal<Omit<MiiverseUserProfile, 'posts'> | null>(null);
  notFound = signal(false);
  fetchPage = signal<FetchPostsPage | null>(null);

  constructor() {
    inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const username = params.get('username') ?? '';
      this.username.set(username);
      this.profile.set(null);
      this.notFound.set(false);
      this.fetchPage.set((sort, page) =>
        this.api.getUserProfile(username, sort, page).pipe(
          tap(({ posts, ...profile }) => this.profile.set(profile)),
          map(detail => detail.posts),
          catchError((err: HttpErrorResponse) => {
            if (err.status === 404) this.notFound.set(true);
            return throwError(() => err);
          }),
        ),
      );
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-MX', { dateStyle: 'long' });
  }
}
