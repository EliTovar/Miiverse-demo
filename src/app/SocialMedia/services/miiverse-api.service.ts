import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

export interface MiiversePost {
  id: number;
  user_id: number | null;
  username: string;
  mii_avatar_url: string;
  content_text: string | null;
  drawing_url: string | null;
  screenshot_url: string | null;
  game_title: string | null;
  yeahs: number;
  created_at: string;
  is_seed: boolean;
  is_spoiler: boolean;
  comments_count: number;
}

/** Comentario de un post. */
export interface MiiverseComment {
  id: number;
  post_id: number;
  user_id: number | null;
  username: string;
  mii_avatar_url: string | null;
  content_text: string;
  is_spoiler: boolean;
  created_at: string;
  updated_at: string | null;
  yeahs: number;
  /** Si el usuario con sesión ya le dio Yeah (false para invitados). */
  yeahed: boolean;
}

/** Fila de la vista de moderación: un post o un comentario. */
export interface MiiverseModerationItem {
  kind: 'post' | 'comment';
  id: number;
  /** El propio id si es un post; el del post comentado si es un comentario. */
  post_id: number;
  username: string;
  mii_avatar_url: string | null;
  content_text: string | null;
  drawing_url: string | null;
  screenshot_url: string | null;
  game_title: string | null;
  is_spoiler: boolean;
  created_at: string;
  yeahs: number;
  comments_count: number | null;
  post_text: string | null;
  post_username: string | null;
  /** Resultados de toda la búsqueda (no solo de esta página). */
  total: number;
}

/** Filtros de la vista de moderación. Los vacíos no se envían. */
export interface ModerationFilters {
  type: 'all' | 'post' | 'comment';
  q: string;
  user: string;
  community: string;
  date: string;   // AAAA-MM-DD
  month: string;  // AAAA-MM
  hour: string;   // '' o '0'..'23'
}

/** Orden de las listas de posts en comunidades y perfiles. */
export type PostSort = 'recent' | 'oldest' | 'popular';

/** Comunidad derivada de `game_title` en el backend. */
export interface MiiverseCommunity {
  name: string;
  posts_count: number;
  last_post_at: string;
}

export interface MiiverseCommunityDetail {
  name: string;
  posts_count: number;
  yeahs_count: number;
  posts: MiiversePost[];
}

export interface MiiverseUserProfile {
  username: string;
  avatar_url: string | null;
  posts_count: number;
  yeahs_received: number;
  communities_count: number;
  first_post_at: string;
  posts: MiiversePost[];
}

/** Resultado de la búsqueda de usuarios. */
export interface MiiverseUserSummary {
  username: string;
  avatar_url: string | null;
  posts_count: number;
}

@Injectable({ providedIn: 'root' })
export class MiiverseApiService {
  private readonly base = API_CONFIG.MIIVERSE_URL;
  private http = inject(HttpClient);

  getFeed(page = 1, limit = 20): Observable<MiiversePost[]> {
    return this.http.get<MiiversePost[]>(`${this.base}/feed?page=${page}&limit=${limit}`);
  }

  getCommunities(search = ''): Observable<MiiverseCommunity[]> {
    const params = search.trim() ? { q: search.trim() } : undefined;
    return this.http.get<MiiverseCommunity[]>(`${this.base}/communities`, { params });
  }

  getCommunity(name: string, sort: PostSort, page = 1, limit = 20): Observable<MiiverseCommunityDetail> {
    return this.http.get<MiiverseCommunityDetail>(
      `${this.base}/communities/${encodeURIComponent(name)}`,
      { params: { sort, page, limit } },
    );
  }

  getPost(id: number): Observable<MiiversePost> {
    return this.http.get<MiiversePost>(`${this.base}/posts/${id}`);
  }

  searchUsers(search = ''): Observable<MiiverseUserSummary[]> {
    const params = search.trim() ? { q: search.trim() } : undefined;
    return this.http.get<MiiverseUserSummary[]>(`${this.base}/users`, { params });
  }

  getComments(postId: number): Observable<MiiverseComment[]> {
    return this.http.get<MiiverseComment[]>(`${this.base}/posts/${postId}/comments`);
  }

  /** El token lo añade el interceptor JWT de la app. */
  createComment(postId: number, dto: { content_text: string; is_spoiler: boolean }): Observable<MiiverseComment> {
    return this.http.post<MiiverseComment>(`${this.base}/posts/${postId}/comments`, dto);
  }

  updateComment(id: number, dto: { content_text: string; is_spoiler: boolean }): Observable<MiiverseComment> {
    return this.http.patch<MiiverseComment>(`${this.base}/comments/${id}`, dto);
  }

  deleteComment(id: number): Observable<{ id: number; post_id: number }> {
    return this.http.delete<{ id: number; post_id: number }>(`${this.base}/comments/${id}`);
  }

  toggleCommentYeah(id: number): Observable<{ yeahs: number; yeahed: boolean }> {
    return this.http.post<{ yeahs: number; yeahed: boolean }>(`${this.base}/comments/${id}/yeah`, {});
  }

  /**
   * Solo admin (el backend responde 403 a cualquier otro rol). Envía la zona
   * horaria del navegador para que día, mes y hora coincidan con lo que se ve.
   */
  getModerationItems(filters: ModerationFilters, page = 1, limit = 30): Observable<MiiverseModerationItem[]> {
    const params: Record<string, string | number> = {
      page,
      limit,
      type: filters.type,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    for (const key of ['q', 'user', 'community', 'date', 'month', 'hour'] as const) {
      const value = filters[key].trim();
      if (value) params[key] = value;
    }
    return this.http.get<MiiverseModerationItem[]>(`${this.base}/admin/items`, { params });
  }

  /** Solo admin: borra el post con sus Yeahs y comentarios. */
  deletePost(id: number): Observable<{ id: number; comments_deleted: number }> {
    return this.http.delete<{ id: number; comments_deleted: number }>(`${this.base}/posts/${id}`);
  }

  getUserProfile(username: string, sort: PostSort, page = 1, limit = 20): Observable<MiiverseUserProfile> {
    return this.http.get<MiiverseUserProfile>(
      `${this.base}/users/${encodeURIComponent(username)}`,
      { params: { sort, page, limit } },
    );
  }

  createPost(dto: { content_text?: string; drawing_url?: string; game_title?: string; is_spoiler?: boolean }): Observable<MiiversePost> {
    return this.http.post<MiiversePost>(`${this.base}/posts`, dto);
  }

  toggleYeah(postId: number): Observable<{ yeahs: number }> {
    return this.http.post<{ yeahs: number }>(`${this.base}/posts/${postId}/yeah`, {});
  }
}
