import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { Role } from './social-media.service';

export interface AdminStats {
  users: number;
  admins: number;
  posts: number;
  comments: number;
  new_users_7d: number;
  posts_7d: number;
  comments_7d: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: Exclude<Role, 'guest'>;
  created_at: string | null;
  posts_count: number;
  comments_count: number;
  /** Usuarios que cumplen la búsqueda (no solo esta página). */
  total: number;
}

/**
 * Rutas del panel de administración (/admin). El backend responde 403 a
 * cualquiera que no sea admin; el token lo añade el interceptor JWT.
 */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly base = `${API_CONFIG.BASE_URL}/admin`;
  private http = inject(HttpClient);

  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.base}/stats`);
  }

  getUsers(search: string, page = 1, limit = 20): Observable<AdminUser[]> {
    const params: Record<string, string | number> = { page, limit };
    if (search.trim()) params['q'] = search.trim();
    return this.http.get<AdminUser[]>(`${this.base}/users`, { params });
  }

  setRole(userId: number, role: AdminUser['role']): Observable<{ id: number; role: AdminUser['role'] }> {
    return this.http.patch<{ id: number; role: AdminUser['role'] }>(`${this.base}/users/${userId}/role`, { role });
  }
}
