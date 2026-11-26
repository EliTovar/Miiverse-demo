import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthStateService } from '../../../core/auth/auth-state.service';
import { ComposerService } from '../../services/composer.service';

/** Datos que cada ruta hija puede declarar en `data` para configurar el marco. */
interface LayoutRouteData {
  title?: string;
  showPostButton?: boolean;
  /** Usa casi todo el ancho de la pantalla (vista de moderación). */
  wide?: boolean;
}

/**
 * Marco visual estilo Miiverse de Wii U: menú lateral con iconos, barra superior
 * verde con el título de la sección y botón flotante "Publicar".
 * Envuelve las rutas de la red social y las de login/registro.
 */
@Component({
  selector: 'app-miiverse-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './miiverse-layout.html',
  styleUrl: './miiverse-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiiverseLayout {
  auth = inject(AuthStateService);
  private router = inject(Router);
  private composer = inject(ComposerService);

  /** Datos de la ruta hija activa; se recalculan en cada navegación. */
  routeData = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.deepestChildData()),
    ),
    { initialValue: {} as LayoutRouteData },
  );

  private deepestChildData(): LayoutRouteData {
    // Se lee del estado global del router: siempre refleja la ruta ya resuelta.
    let snapshot = this.router.routerState.snapshot.root;
    while (snapshot.firstChild) snapshot = snapshot.firstChild;
    return snapshot.data as LayoutRouteData;
  }

  openComposer() {
    this.composer.open();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/social']);
  }
}
