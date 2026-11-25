import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Paleta propia para los iconos de comunidad (no se usan carátulas de juegos). */
const PALETTE = ['#5ac800', '#00a0e9', '#ff8a00', '#e6427a', '#8f5cd8', '#00b39a', '#f2b600', '#e85d3c'];

/**
 * Icono cuadrado de una comunidad: iniciales del nombre sobre un color que
 * siempre es el mismo para el mismo nombre.
 */
@Component({
  selector: 'app-community-icon',
  standalone: true,
  template: `
    <span class="mv-community-icon"
          [style.width.px]="size()" [style.height.px]="size()"
          [style.font-size.px]="size() * 0.4"
          [style.background]="color()"
          aria-hidden="true">{{ initials() }}</span>
  `,
  styles: [`
    :host { display: inline-flex; flex-shrink: 0; }
    .mv-community-icon {
      display: grid;
      place-items: center;
      border-radius: 22%;
      color: #fff;
      font-weight: 800;
      letter-spacing: -0.5px;
      text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
      box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.12);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityIcon {
  name = input.required<string>();
  size = input(48);

  initials = computed(() => {
    const words = this.name().split(/[\s:.\-]+/).filter(w => /^[\p{L}\p{N}]/u.test(w));
    return words.slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  });

  color = computed(() => {
    // Misma normalización que el backend: "Splatoon 3" y "splatoon-3" son la
    // misma comunidad, así que deben tener el mismo color.
    const key = this.name()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita los acentos
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    let hash = 0;
    for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return PALETTE[Math.abs(hash) % PALETTE.length];
  });
}
