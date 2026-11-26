import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

/**
 * Envuelve un contenido que puede tener spoilers. Si `active` es true, lo
 * tapa con un aviso hasta que el lector pulse "Mostrar".
 */
@Component({
  selector: 'app-spoiler',
  standalone: true,
  template: `
    @if (active() && !revealed()) {
      <div class="mv-spoiler-cover">
        <i class="pi pi-eye-slash" aria-hidden="true"></i>
        <span>Este contenido tiene spoilers.</span>
        <button type="button" (click)="revealed.set(true)">Mostrar</button>
      </div>
    } @else {
      <ng-content />
    }
  `,
  styles: [`
    :host { display: block; }
    .mv-spoiler-cover {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
      padding: 14px 16px;
      border: 1px dashed var(--mv-border);
      border-radius: 10px;
      background: var(--mv-surface-soft);
      color: var(--mv-text-soft);
      font-size: 14px;
      font-weight: 700;
    }
    .mv-spoiler-cover i { font-size: 18px; }
    .mv-spoiler-cover button {
      margin-left: auto;
      padding: 6px 16px;
      border: 1px solid var(--mv-orange);
      border-radius: 999px;
      background: #fff;
      color: var(--mv-orange);
      font: inherit;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }
    .mv-spoiler-cover button:hover { background: var(--mv-orange); color: #fff; }
    .mv-spoiler-cover button:focus-visible { outline: 3px solid var(--mv-orange); outline-offset: 2px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Spoiler {
  active = input(false);
  revealed = signal(false);
}
