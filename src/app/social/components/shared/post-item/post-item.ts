import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MiiverseApiService } from '../../../services/miiverse-api.service';
import { MiiversePost } from '../../../models/miiverse.models';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { CommunityIcon } from '../community-icon/community-icon';
import { Spoiler } from '../spoiler/spoiler';

/**
 * Un post de Miiverse tal y como se ve en las listas (Actividad, comunidad,
 * perfil) y en su propia página. Gestiona su propio botón "Yeah!".
 */
@Component({
  selector: 'app-post-item',
  standalone: true,
  imports: [RouterLink, CommunityIcon, Spoiler],
  templateUrl: './post-item.html',
  styleUrl: './post-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostItem implements OnInit {
  private api = inject(MiiverseApiService);
  private auth = inject(AuthStateService);

  post = input.required<MiiversePost>();
  /** En la página del post se muestra la fecha completa y no se enlaza a sí mismo. */
  detail = input(false);

  /** Contador local: se actualiza con la respuesta del backend al dar Yeah. */
  yeahs = signal(0);

  get isGuest() { return this.auth.isGuest(); }

  ngOnInit() {
    this.yeahs.set(this.post().yeahs);
  }

  toggleYeah() {
    if (this.isGuest) return;
    this.api.toggleYeah(this.post().id).subscribe({
      next: ({ yeahs }) => this.yeahs.set(yeahs),
    });
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Hace menos de un minuto';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs} h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    return new Date(dateStr).toLocaleDateString('es-MX');
  }

  fullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
