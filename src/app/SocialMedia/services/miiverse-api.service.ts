import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  getUserProfile(username: string, sort: PostSort, page = 1, limit = 20): Observable<MiiverseUserProfile> {
    return this.http.get<MiiverseUserProfile>(
      `${this.base}/users/${encodeURIComponent(username)}`,
      { params: { sort, page, limit } },
    );
  }

  createPost(dto: { content_text?: string; drawing_url?: string; game_title?: string }): Observable<MiiversePost> {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<MiiversePost>(`${this.base}/posts`, dto, { headers });
  }

  toggleYeah(postId: number): Observable<{ yeahs: number }> {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<{ yeahs: number }>(`${this.base}/posts/${postId}/yeah`, {}, { headers });
  }
}
