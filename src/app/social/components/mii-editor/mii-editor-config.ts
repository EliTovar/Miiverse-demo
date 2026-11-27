import { AdjustablePart, MII_CATALOG, MiiColors, Slider } from '../../../three/online/loaders/mii-appearance';
import { FacePartType } from '../../../three/online/loaders/mii-face';

/*
 * Qué se edita en cada categoría del menú "Mi Mii".
 * El componente solo recorre esta lista: para añadir una categoría basta con añadirla aquí.
 */

export type PartField = 'head' | 'hair' | 'eyebrows' | 'eyes' | 'nose' | 'mouth' | 'mustache' | 'beard' | 'glasses' | 'top' | 'bottoms' | 'shoes';

/** De dónde sale la miniatura de cada opción. */
export type ThumbSource =
  | { kind: 'model'; folder: string } // foto ya generada: thumbs/<folder>/<id>.webp
  | { kind: 'face'; type: FacePartType; color: keyof MiiColors }; // se dibuja en el navegador

export interface OptionGroup {
  field: PartField;
  title: string;
  options: readonly string[];
  thumbs: ThumbSource;
  /** Añade la opción "Ninguno" (bigote, barba, lentes). */
  optional?: boolean;
}

export interface ColorGroup {
  field: keyof MiiColors;
  title: string;
  palette: readonly string[];
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  /** Cámara de la vista previa: cerca de la cara o el cuerpo entero. */
  view: 'face' | 'body';
  groups: OptionGroup[];
  colors: ColorGroup[];
  /** Controles especiales: interruptores (lunar, voltear peinado) o altura/peso. */
  extra?: 'mole' | 'body' | 'hairFlip';
  /** Partes con deslizadores de posición (subir, separar, girar, tamaño…). */
  adjust?: { part: AdjustablePart; title: string }[];
}

/** Texto de cada deslizador: [lado izquierdo, nombre, lado derecho]. */
export const SLIDER_LABELS: Record<Slider, [string, string, string]> = {
  y: ['Abajo', 'Altura', 'Arriba'],
  x: ['Izquierda', 'Lado', 'Derecha'],
  spacing: ['Juntar', 'Separación', 'Separar'],
  rotate: ['↺', 'Giro', '↻'],
  scale: ['Pequeño', 'Tamaño', 'Grande'],
  stretch: ['Aplastar', 'Forma', 'Estirar'],
};

/** Convierte un color HSL (grados, %, %) a "#rrggbb". */
function hsl(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

const HUES = [0, 25, 45, 60, 100, 150, 190, 215, 260, 310];
const LIGHTNESS = [85, 72, 60, 48, 36, 24];

/** Paleta general de 10 columnas: una fila por luminosidad y una fila de grises. */
export const PALETTE: readonly string[] = [
  ...LIGHTNESS.flatMap((l) => HUES.map((h) => hsl(h, 70, l))),
  ...Array.from({ length: 10 }, (_, i) => hsl(0, 0, 100 - i * 10.5)),
];

export const SKIN_TONES: readonly string[] = [
  '#ffe3cf', '#f8d2b4', '#f2c9a0', '#e8b48a', '#d9a06f', '#c68a5a', '#a86e45', '#8a5634', '#6b4027', '#4a2c1b',
];

const C = MII_CATALOG;
const model = (folder: string): ThumbSource => ({ kind: 'model', folder });

export const CATEGORIES: Category[] = [
  {
    id: 'face', label: 'Cara', icon: 'pi pi-user', view: 'face', extra: 'mole',
    adjust: [{ part: 'mole', title: 'Posición del lunar' }],
    groups: [{ field: 'head', title: 'Forma de la cara', options: C.heads, thumbs: model('heads') }],
    colors: [{ field: 'skin', title: 'Color de piel', palette: SKIN_TONES }],
  },
  {
    id: 'hair', label: 'Peinado', icon: 'pi pi-star', view: 'face', extra: 'hairFlip',
    groups: [{ field: 'hair', title: 'Peinado', options: C.hair, thumbs: model('hair') }],
    colors: [{ field: 'hair', title: 'Color de pelo', palette: PALETTE }],
  },
  {
    id: 'eyebrows', label: 'Cejas', icon: 'pi pi-minus', view: 'face',
    adjust: [{ part: 'eyebrows', title: 'Posición' }],
    groups: [{ field: 'eyebrows', title: 'Cejas', options: C.eyebrows, thumbs: { kind: 'face', type: 'eyebrows', color: 'hair' } }],
    colors: [{ field: 'hair', title: 'Color (igual que el pelo)', palette: PALETTE }],
  },
  {
    id: 'eyes', label: 'Ojos', icon: 'pi pi-eye', view: 'face',
    adjust: [{ part: 'eyes', title: 'Posición' }],
    groups: [{ field: 'eyes', title: 'Ojos', options: C.eyes, thumbs: { kind: 'face', type: 'eyes', color: 'eyes' } }],
    colors: [{ field: 'eyes', title: 'Color de ojos', palette: PALETTE }],
  },
  {
    id: 'nose', label: 'Nariz', icon: 'pi pi-angle-down', view: 'face',
    adjust: [{ part: 'nose', title: 'Posición' }],
    groups: [{ field: 'nose', title: 'Nariz', options: C.noses, thumbs: model('noses') }],
    colors: [],
  },
  {
    id: 'mouth', label: 'Boca', icon: 'pi pi-face-smile', view: 'face',
    adjust: [{ part: 'mouth', title: 'Posición' }],
    groups: [{ field: 'mouth', title: 'Boca', options: C.mouths, thumbs: { kind: 'face', type: 'mouths', color: 'mouth' } }],
    colors: [{ field: 'mouth', title: 'Color de labios', palette: PALETTE }],
  },
  {
    id: 'facial-hair', label: 'Vello facial', icon: 'pi pi-sparkles', view: 'face',
    adjust: [{ part: 'mustache', title: 'Posición del bigote' }],
    groups: [
      { field: 'mustache', title: 'Bigote', options: C.mustaches, optional: true, thumbs: { kind: 'face', type: 'mustaches', color: 'hair' } },
      { field: 'beard', title: 'Barba', options: C.beards, optional: true, thumbs: model('beards') },
    ],
    colors: [{ field: 'hair', title: 'Color (igual que el pelo)', palette: PALETTE }],
  },
  {
    id: 'glasses', label: 'Lentes', icon: 'pi pi-circle', view: 'face',
    adjust: [{ part: 'glasses', title: 'Posición' }],
    groups: [{ field: 'glasses', title: 'Lentes', options: C.glasses, optional: true, thumbs: model('glasses') }],
    colors: [{ field: 'glasses', title: 'Color de la montura', palette: PALETTE }],
  },
  { id: 'body', label: 'Cuerpo', icon: 'pi pi-arrows-v', view: 'body', extra: 'body', groups: [], colors: [] },
  {
    id: 'clothes', label: 'Ropa', icon: 'pi pi-shopping-bag', view: 'body',
    groups: [
      { field: 'top', title: 'Arriba (usa tu color favorito)', options: C.tops, thumbs: model('tops') },
      { field: 'bottoms', title: 'Abajo', options: C.bottoms, thumbs: model('bottoms') },
      { field: 'shoes', title: 'Calzado', options: C.shoes, thumbs: model('shoes') },
    ],
    colors: [
      { field: 'bottoms', title: 'Color de abajo', palette: PALETTE },
      { field: 'shoes', title: 'Color del calzado', palette: PALETTE },
    ],
  },
  {
    id: 'favorite', label: 'Color favorito', icon: 'pi pi-palette', view: 'body',
    groups: [],
    colors: [{ field: 'favorite', title: 'Color favorito', palette: PALETTE }],
  },
];

