import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, AfterViewInit, ViewChild, computed, inject, signal } from '@angular/core';
import { DEFAULT_APPEARANCE, MII_CATALOG, MiiAppearance, MiiColors } from '../../../three/online/loaders/mii-appearance';
import { loadSavedAppearance, saveAppearance } from '../../../three/online/loaders/mii-appearance-storage';
import { MiiPreview } from './mii-preview';

type PartKey = 'head' | 'nose' | 'hair' | 'top' | 'bottoms' | 'shoes';

interface PartGroup {
  key: PartKey;
  title: string;
  /** Nombre corto para numerar las opciones sin nombre propio ("Cabeza 1"). */
  item: string;
  options: readonly string[];
}

interface Section {
  id: string;
  label: string;
  parts: PartGroup[];
  colors: { key: keyof MiiColors; label: string }[];
}

/** Pestañas del menú: qué piezas y qué colores se editan en cada una. */
const SECTIONS: Section[] = [
  {
    id: 'face', label: 'Cara',
    parts: [
      { key: 'head', title: 'Forma de la cabeza', item: 'Cabeza', options: MII_CATALOG.heads },
      { key: 'nose', title: 'Nariz', item: 'Nariz', options: MII_CATALOG.noses },
    ],
    colors: [{ key: 'skin', label: 'Piel' }],
  },
  { id: 'hair', label: 'Pelo', parts: [{ key: 'hair', title: 'Peinado', item: 'Peinado', options: MII_CATALOG.hair }], colors: [{ key: 'hair', label: 'Color' }] },
  { id: 'top', label: 'Arriba', parts: [{ key: 'top', title: 'Prenda', item: 'Prenda', options: MII_CATALOG.tops }], colors: [{ key: 'top', label: 'Color' }] },
  { id: 'bottoms', label: 'Abajo', parts: [{ key: 'bottoms', title: 'Prenda', item: 'Prenda', options: MII_CATALOG.bottoms }], colors: [{ key: 'bottoms', label: 'Color' }] },
  { id: 'shoes', label: 'Zapatos', parts: [{ key: 'shoes', title: 'Calzado', item: 'Calzado', options: MII_CATALOG.shoes }], colors: [{ key: 'shoes', label: 'Color' }] },
];

/** Nombres legibles de las piezas. Las que no aparecen se numeran ("Cabeza 1", "Peinado 3"…). */
const LABELS: Record<string, string> = {
  'tshirt-long': 'Camiseta manga larga', 'tshirt-half': 'Camiseta manga corta', 'tshirt-sleeveless': 'Sin mangas',
  'shirt-long': 'Camisa', 'coat-long': 'Abrigo', 'outer-long': 'Chaqueta',
  'pants-long': 'Pantalón', 'pants-wide': 'Pantalón ancho', 'skirt-box': 'Falda recta', 'skirt-long': 'Falda larga', 'skirt-mini': 'Minifalda',
  sneaker: 'Tenis', standard: 'Zapatos', 'boots-short': 'Botines', loafer: 'Mocasines', sandal: 'Sandalias', skate: 'Tenis de skate',
};

/**
 * Página "Mi Mii": elige piezas y colores, mira el resultado en 3D y guárdalo.
 * La apariencia se guarda en el navegador y se usa al aparecer en el mundo 3D.
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

  @ViewChild('previewHost', { static: true }) previewHost!: ElementRef<HTMLDivElement>;

  readonly sections = SECTIONS;
  appearance = signal<MiiAppearance>(loadSavedAppearance() ?? DEFAULT_APPEARANCE);
  activeId = signal(SECTIONS[0].id);
  active = computed(() => SECTIONS.find((s) => s.id === this.activeId())!);
  saved = signal(true);
  loadError = signal(false);

  ngAfterViewInit(): void {
    // El render 3D va fuera de Angular para no lanzar detección de cambios en cada frame.
    this.zone.runOutsideAngular(() => {
      this.preview = new MiiPreview(this.previewHost.nativeElement);
    });
    this.refreshPreview();
  }

  ngOnDestroy(): void {
    this.preview?.dispose();
  }

  label(group: PartGroup, id: string): string {
    return LABELS[id] ?? `${group.item} ${group.options.indexOf(id) + 1}`;
  }

  choose(key: PartKey, id: string) {
    this.update({ ...this.appearance(), [key]: id });
  }

  setColor(key: keyof MiiColors, event: Event) {
    const color = (event.target as HTMLInputElement).value;
    this.update({ ...this.appearance(), colors: { ...this.appearance().colors, [key]: color } });
  }

  save() {
    try {
      saveAppearance(this.appearance());
      this.saved.set(true);
    } catch {
      this.loadError.set(true); // localStorage lleno o bloqueado
    }
  }

  reset() {
    this.update(loadSavedAppearance() ?? DEFAULT_APPEARANCE);
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
}
