import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { ComposerService } from '../../services/composer.service';

/**
 * Barra superior del mundo 3D (y del panel 3D de admin).
 * Usa el mismo tema que el marco de Miiverse (variables --mv-* de styles.scss).
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  auth = inject(AuthStateService);
  private router = inject(Router);
  private composerService = inject(ComposerService);

  openComposer() {
    this.composerService.open({ mode: 'draw-only' });
  }

  goLogin() {
    this.router.navigate(['/auth/login']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
