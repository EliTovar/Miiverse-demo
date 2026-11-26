import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminApiService, AdminStats, AdminUser } from '../../services/admin-api.service';
import { AuthStateService } from '../../../core/auth/auth-state.service';

type Tab = 'summary' | 'users' | 'tools';
const PAGE_SIZE = 20;

/**
 * Panel de administración (solo admin): resumen con cifras, gestión de
 * usuarios y roles, y accesos a las herramientas (moderación y asistente IA).
 * La ruta la protege AuthGuard (rol admin) y el backend vuelve a comprobarlo.
 */
@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-panel.html',
  styleUrl: './admin-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPanel implements OnInit {
  private api = inject(AdminApiService);
  auth = inject(AuthStateService);

  tab = signal<Tab>('summary');

  // ── Resumen ───────────────────────────────────────────────────────────────
  stats = signal<AdminStats | null>(null);
  statsError = signal('');

  // ── Usuarios ──────────────────────────────────────────────────────────────
  search = '';
  users = signal<AdminUser[]>([]);
  total = signal(0);
  loadingUsers = signal(false);
  usersError = signal('');
  /** Usuario cuyo rol se está guardando. */
  savingId = signal<number | null>(null);
  /** Mensaje tras cambiar un rol (éxito o error), junto al usuario. */
  notice = signal<{ id: number; text: string; error: boolean } | null>(null);
  hasMore = computed(() => this.users().length < this.total());
  private page = 1;
  private searchAtLoad = '';
  private usersLoaded = false;

  ngOnInit() {
    this.loadStats();
  }

  showTab(tab: Tab) {
    this.tab.set(tab);
    if (tab === 'users' && !this.usersLoaded) this.searchUsers();
    if (tab === 'summary') this.loadStats();
  }

  loadStats() {
    this.statsError.set('');
    this.api.getStats().subscribe({
      next: stats => this.stats.set(stats),
      error: (err: HttpErrorResponse) => this.statsError.set(this.describe(err, 'No se pudieron cargar las cifras.')),
    });
  }

  searchUsers() {
    this.searchAtLoad = this.search;
    this.loadUsers(1);
  }

  loadMoreUsers() {
    this.loadUsers(this.page + 1);
  }

  private loadUsers(page: number) {
    this.usersLoaded = true;
    this.loadingUsers.set(true);
    this.usersError.set('');
    this.api.getUsers(this.searchAtLoad, page, PAGE_SIZE).subscribe({
      next: list => {
        this.page = page;
        this.users.update(current => (page === 1 ? list : [...current, ...list]));
        this.total.set(list[0]?.total ?? (page === 1 ? 0 : this.total()));
        this.loadingUsers.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.usersError.set(this.describe(err, 'No se pudieron cargar los usuarios.'));
        this.loadingUsers.set(false);
      },
    });
  }

  /** Nadie puede cambiar su propio rol (el backend también lo impide). */
  isMe(user: AdminUser): boolean {
    return user.id === this.auth.userId();
  }

  toggleRole(user: AdminUser) {
    const next = user.role === 'admin' ? 'user' : 'admin';
    const question = next === 'admin'
      ? `¿Dar permisos de administrador a ${user.username}? Podrá moderar y gestionar usuarios.`
      : `¿Quitar los permisos de administrador a ${user.username}?`;
    if (!confirm(question)) return;

    this.savingId.set(user.id);
    this.notice.set(null);
    this.api.setRole(user.id, next).subscribe({
      next: ({ role }) => {
        this.users.update(list => list.map(u => (u.id === user.id ? { ...u, role } : u)));
        this.notice.set({
          id: user.id,
          text: 'Guardado. Se aplica cuando vuelva a iniciar sesión.',
          error: false,
        });
        this.savingId.set(null);
        this.loadStats();
      },
      error: (err: HttpErrorResponse) => {
        this.notice.set({ id: user.id, text: err.error?.message ?? 'No se pudo cambiar el rol', error: true });
        this.savingId.set(null);
      },
    });
  }

  formatDate(dateStr: string | null): string {
    return dateStr ? new Date(dateStr).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—';
  }

  private describe(err: HttpErrorResponse, fallback: string): string {
    return err.status === 403 ? 'Tu sesión no tiene permisos de administrador.' : fallback;
  }
}
