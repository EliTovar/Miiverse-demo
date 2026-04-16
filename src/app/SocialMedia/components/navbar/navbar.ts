import { Component, inject, effect } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { SocialMediaServicie } from '../../services/social-media.service';
import { Router } from '@angular/router';
import { ComposerService } from '../../services/composer.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [MenubarModule, CommonModule, ButtonModule],
  templateUrl: './navbar.html',
})
export class Navbar {
  auth = inject(SocialMediaServicie);
  router = inject(Router);
  private composerService = inject(ComposerService);

  items: MenuItem[] = [];

  constructor() {
    effect(() => {
      this.auth.role();
      this.buildMenu();
    });
  }

  buildMenu() {
    this.items = [
      { label: 'Home', icon: 'pi pi-home', routerLink: '/' },
      { label: 'MiiVerse', icon: 'pi pi-star', routerLink: '/social' },
    ];

    if (!this.auth.isGuest()) {
      this.items.push({
        label: 'Crear Post',
        icon: 'pi pi-plus',
        command: () => {
          this.composerService.open({ mode: 'draw-only' });
        }
      });
    }

    if (this.auth.role() === 'admin') {
      this.items.push({
        label: 'Admin',
        icon: 'pi pi-cog',
        routerLink: '/social/admin',
      });
    }
  }

  goLogin() {
    this.router.navigate(['/auth/login']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
