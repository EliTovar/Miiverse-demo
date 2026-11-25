import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, tap, throwError } from 'rxjs';
import { MiiverseApiService, MiiverseCommunityDetail } from '../../services/miiverse-api.service';
import { CommunityIcon } from '../shared/community-icon/community-icon';
import { FetchPostsPage, PostList } from '../shared/post-list/post-list';

/** Página de una comunidad: cabecera con sus datos y sus posts. */
@Component({
  selector: 'app-community',
  standalone: true,
  imports: [RouterLink, CommunityIcon, PostList],
  templateUrl: './community.html',
  styleUrl: '../shared/page-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Community {
  private api = inject(MiiverseApiService);

  summary = signal<Omit<MiiverseCommunityDetail, 'posts'> | null>(null);
  notFound = signal(false);
  fetchPage = signal<FetchPostsPage | null>(null);

  constructor() {
    inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const name = params.get('name') ?? '';
      this.summary.set(null);
      this.notFound.set(false);
      // Cada respuesta trae el resumen de la comunidad y una página de posts.
      this.fetchPage.set((sort, page) =>
        this.api.getCommunity(name, sort, page).pipe(
          tap(({ posts, ...summary }) => this.summary.set(summary)),
          map(detail => detail.posts),
          catchError((err: HttpErrorResponse) => {
            if (err.status === 404) this.notFound.set(true);
            return throwError(() => err);
          }),
        ),
      );
    });
  }
}
