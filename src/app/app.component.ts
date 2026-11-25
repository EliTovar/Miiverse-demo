import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Navbar } from "./SocialMedia/components/navbar/navbar";
import { ComposerModalComponent } from './SocialMedia/components/shared/composer-modal/composer-modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, ComposerModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Miiverse-01';
  private router = inject(Router);

  /**
   * La red social y el login/registro tienen su propio menú lateral (estilo Wii U),
   * así que ahí se oculta la barra superior global. El mundo 3D y el panel de
   * administración la siguen usando.
   */
  showNavbar = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => !this.usesMiiverseLayout(this.router.url)),
    ),
    { initialValue: true },
  );

  private usesMiiverseLayout(url: string): boolean {
    const path = url.split(/[?#]/)[0];
    if (path.startsWith('/social/admin')) return false;
    return path === '/social' || path.startsWith('/social/') || path.startsWith('/auth/');
  }
}
