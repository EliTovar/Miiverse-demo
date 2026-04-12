import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class MiiverseApiService {
  private readonly base = 'http://192.168.100.15:3000/miiverse';
  private http = inject(HttpClient);

  getFeed(page = 1, limit = 20): Observable<MiiversePost[]> {
    return this.http.get<MiiversePost[]>(`${this.base}/feed?page=${page}&limit=${limit}`);
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
