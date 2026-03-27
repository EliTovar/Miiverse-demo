import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
} from '@angular/router';
import { SocialMediaServicie, Role } from '../services/social-media.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private auth: SocialMediaServicie,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const allowedRoles = route.data['roles'] as Role[];

    // Guest nunca entra a rutas protegidas
    if (this.auth.isGuest()) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Si no hay roles definidos → solo requiere login
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    // Validar rol
    if (!allowedRoles.includes(this.auth.role())) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }
}
