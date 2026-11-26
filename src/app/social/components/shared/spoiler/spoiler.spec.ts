import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Spoiler } from './spoiler';

@Component({
  standalone: true,
  imports: [Spoiler],
  template: `<app-spoiler [active]="active()"><p class="secreto">El final</p></app-spoiler>`,
})
class Host {
  active = signal(true);
}

describe('Spoiler', () => {
  it('tapa el contenido marcado hasta pulsar "Mostrar"', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.secreto')).toBeNull();
    expect(el.textContent).toContain('Este contenido tiene spoilers.');

    (el.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.secreto')?.textContent).toBe('El final');
  });

  it('no tapa nada si no es spoiler', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.active.set(false);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.secreto')).not.toBeNull();
  });
});
