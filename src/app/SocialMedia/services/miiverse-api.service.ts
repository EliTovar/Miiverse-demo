import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import {
  MiiversePost,
  MiiverseComment,
  MiiverseModerationItem,
  ModerationFilters,
  PostSort,
  MiiverseCommunity,
  MiiverseCommunityDetail,
  MiiverseUserProfile,
  MiiverseUserSummary,
} from '../models/miiverse.models';

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
