import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, AfterViewInit, ViewChild, computed, inject, signal } from '@angular/core';
import { ADJUSTABLE, AdjustablePart, BASE_MIIS, MiiAppearance, MiiColors, Slider, adjustment } from '../../../three/online/loaders/mii-appearance';
import { loadSavedAppearance, saveAppearance } from '../../../three/online/loaders/mii-appearance-storage';
import { facePartThumbnail } from '../../../three/online/loaders/mii-face';
import { CATEGORIES, Category, OptionGroup, PartField, SLIDER_LABELS } from './mii-editor-config';
import { MiiPreview } from './mii-preview';

const THUMBS_PATH = 'models/mii-parts/thumbs';

/**
 * Página "Mi Mii" (estilo editor de Mii de Switch):
 * 1. Si aún no tienes Mii, eliges con cuál empezar.
 * 2. Eliges una categoría (Cara, Peinado, Ojos…) y cambias piezas y colores.
 * 3. "Listo" lo guarda en el navegador; se usa al entrar al Mundo 3D.
 */
@Component({
  selector: 'app-mii-editor',
  standalone: true,
  templateUrl: './mii-editor.html',
  styleUrl: './mii-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiiEditor implements AfterViewInit, OnDestroy {
  private zone = inject(NgZone);
  private preview?: MiiPreview;
  private savedAppearance = loadSavedAppearance();

  @ViewChild('previewHost', { static: true }) previewHost!: ElementRef<HTMLDivElement>;

  readonly categories = CATEGORIES;
  readonly sliderLabels = SLIDER_LABELS;
  readonly slidersOf = (part: AdjustablePart): readonly Slider[] => ADJUSTABLE[part];
  readonly baseMiis = BASE_MIIS.map((_, i) => `${THUMBS_PATH}/base/${i}.webp`);

  /** Sin Mii guardado se empieza eligiendo un Mii base. */
  choosingBase = signal(this.savedAppearance === null);
  appearance = signal<MiiAppearance>(this.savedAppearance ?? BASE_MIIS[0]);
  activeId = signal(CATEGORIES[0].id);
  active = computed(() => CATEGORIES.find((c) => c.id === this.activeId())!);
  saved = signal(this.savedAppearance !== null);
  /** Vista previa en 3D (gira un poco) o en 2D (de frente y quieta, como una foto). */
  is3d = signal(true);
  loadError = signal(false);
  /** Miniaturas de ojos, cejas, bocas y bigotes (se dibujan con el color actual). */
  private faceThumbs = signal<Record<string, string>>({}); // "eyes/004" → data URL
  private faceThumbColors = new Map<string, string>(); // con qué color se dibujó cada una

  ngAfterViewInit(): void {
    // El render 3D va fuera de Angular para no lanzar detección de cambios en cada frame.
    this.zone.runOutsideAngular(() => {
      this.preview = new MiiPreview(this.previewHost.nativeElement);
      this.preview.focus(this.active().view);
    });
    this.refreshPreview();
  }

  ngOnDestroy(): void {
    this.preview?.dispose();
  }

  startWith(index: number) {
    this.choosingBase.set(false);
    this.update(BASE_MIIS[index]);
    this.openCategory(CATEGORIES[0]);
  }

  openCategory(category: Category) {
    this.activeId.set(category.id);
    this.preview?.focus(category.view);
    this.loadFaceThumbs();
  }

  thumb(group: OptionGroup, id: string): string {
    const source = group.thumbs;
    if (source.kind === 'model') return `${THUMBS_PATH}/${source.folder}/${id}.webp`;
    return this.faceThumbs()[`${source.type}/${id}`] ?? '';
  }

  isSelected(field: PartField, id: string | null): boolean {
    return this.appearance()[field] === id;
  }

  choose(field: PartField, id: string | null) {
    this.update({ ...this.appearance(), [field]: id });
  }

  setColor(field: keyof MiiColors, color: string) {
    this.update({ ...this.appearance(), colors: { ...this.appearance().colors, [field]: color } });
    this.loadFaceThumbs(); // las miniaturas de la cara usan el color
  }

  setBody(field: 'height' | 'weight', event: Event) {
    this.update({ ...this.appearance(), [field]: Number((event.target as HTMLInputElement).value) });
  }

  toggleView() {
    this.is3d.update((value) => !value);
    this.preview?.setMode(this.is3d() ? '3d' : '2d');
  }

  adjustValue(part: AdjustablePart, slider: Slider): number {
    return adjustment(this.appearance(), part, slider);
  }

  setAdjust(part: AdjustablePart, slider: Slider, event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    const current = this.appearance();
    this.update({ ...current, adjust: { ...current.adjust, [part]: { ...current.adjust[part], [slider]: value } } });
  }

  /** Vuelve los controles de esa parte a su posición original. */
  resetAdjust(part: AdjustablePart) {
    const { [part]: _removed, ...rest } = this.appearance().adjust;
    this.update({ ...this.appearance(), adjust: rest });
  }

  toggleHairFlip() {
    this.update({ ...this.appearance(), hairFlip: !this.appearance().hairFlip });
  }

  toggleMole() {
    this.update({ ...this.appearance(), mole: !this.appearance().mole });
  }

  save() {
    try {
      saveAppearance(this.appearance());
      this.savedAppearance = this.appearance();
      this.saved.set(true);
    } catch {
      this.loadError.set(true); // localStorage lleno o bloqueado
    }
  }

  reset() {
    if (!this.savedAppearance) {
      this.choosingBase.set(true); // aún no había Mii: vuelve a elegir uno base
      return;
    }
    this.update(this.savedAppearance);
    this.saved.set(true);
  }

  private update(next: MiiAppearance) {
    this.appearance.set(next);
    this.saved.set(false);
    this.refreshPreview();
  }

  private refreshPreview() {
    const appearance = this.appearance();
    this.zone.runOutsideAngular(() => {
      this.preview?.show(appearance).catch(() => this.zone.run(() => this.loadError.set(true)));
    });
  }

  /** Dibuja las miniaturas de la cara de la categoría abierta que falten o tengan otro color. */
  private async loadFaceThumbs() {
    const jobs: Promise<[string, string]>[] = [];
    for (const group of this.active().groups) {
      const source = group.thumbs;
      if (source.kind !== 'face') continue;
      const color = this.appearance().colors[source.color];
      for (const id of group.options) {
        const key = `${source.type}/${id}`;
        if (this.faceThumbColors.get(key) === color) continue;
        this.faceThumbColors.set(key, color);
        jobs.push(facePartThumbnail(source.type, id, color).then((url) => [key, url]));
      }
    }
    if (!jobs.length) return;
    // Mientras se dibujan se siguen viendo las anteriores; si alguna falla, el botón muestra su número.
    const done = await Promise.allSettled(jobs);
    const added = done.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    this.faceThumbs.update((thumbs) => ({ ...thumbs, ...Object.fromEntries(added) }));
  }
}
