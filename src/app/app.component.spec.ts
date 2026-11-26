import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthStateService } from './core/auth/auth-state.service';

@Component({ standalone: true, template: '' })
class EmptyPage {}

/**
 * La barra superior global solo se ve fuera de la red social: en /social y
 * /auth la sustituye el menú lateral de Miiverse; el panel 3D de admin la usa.
 */
describe('AppComponent', () => {
  // Servicio de sesión falso: evita abrir el socket real durante las pruebas.
  const fakeAuth = {
    role: signal('guest'),
    isGuest: signal(true),
    username: signal<string | null>(null),
    userId: signal<number | null>(null),
    getToken: () => null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideRouter([{ path: '**', component: EmptyPage }]),
        { provide: AuthStateService, useValue: fakeAuth },
      ],
    }).compileComponents();
  });

  async function navbarVisibleAt(url: string): Promise<boolean> {
    const fixture = TestBed.createComponent(AppComponent);
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    return fixture.componentInstance.showNavbar();
  }

  it('muestra la barra global en el mundo 3D', async () => {
    expect(await navbarVisibleAt('/')).toBeTrue();
  });

  it('oculta la barra global en la red social y en login/registro', async () => {
    expect(await navbarVisibleAt('/social')).toBeFalse();
    expect(await navbarVisibleAt('/social/communities?q=mario')).toBeFalse();
    expect(await navbarVisibleAt('/auth/login')).toBeFalse();
  });

  it('mantiene la barra global en el panel 3D de admin', async () => {
    expect(await navbarVisibleAt('/social/admin/ia')).toBeTrue();
  });
});
