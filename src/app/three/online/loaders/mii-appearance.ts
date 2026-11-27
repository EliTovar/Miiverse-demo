/*
 * Apariencia del Mii: qué piezas lleva y de qué color.
 *
 * Es un objeto pequeño y serializable (JSON) para poder guardarlo y enviarlo
 * por red más adelante. Los ids corresponden a archivos en
 * public/models/mii-parts/ (ver tools/mii-parts/parts.json).
 */

export interface MiiColors {
  skin: string;
  /** Pelo, cejas, bigote y barba. */
  hair: string;
  eyes: string;
  mouth: string;
  glasses: string;
  /** Color favorito: es el color de la prenda de arriba. */
  favorite: string;
  bottoms: string;
  shoes: string;
}

/*
 * Controles de posición de las partes de la cara (como en el editor de Mii).
 * Cada valor va de 0 a 1; 0.5 = la posición original de la pieza.
 *   y = subir/bajar, x = mover a los lados, spacing = separar, rotate = girar,
 *   scale = tamaño, stretch = estirar a lo alto.
 */
export type Slider = 'y' | 'x' | 'spacing' | 'rotate' | 'scale' | 'stretch';

export const ADJUSTABLE = {
  eyebrows: ['y', 'spacing', 'rotate', 'scale', 'stretch'],
  eyes: ['y', 'spacing', 'rotate', 'scale', 'stretch'],
  nose: ['y', 'scale'],
  mouth: ['y', 'scale', 'stretch'],
  mustache: ['y', 'scale'],
  mole: ['y', 'x', 'scale'],
  glasses: ['y', 'scale'],
} as const satisfies Record<string, readonly Slider[]>;

export type AdjustablePart = keyof typeof ADJUSTABLE;
export type Adjustments = Partial<Record<AdjustablePart, Partial<Record<Slider, number>>>>;

/** Valor de un control (0.5 si nunca se movió). */
export function adjustment(appearance: MiiAppearance, part: AdjustablePart, slider: Slider): number {
  return appearance.adjust[part]?.[slider] ?? 0.5;
}

export interface MiiAppearance {
  head: string;
  hair: string;
  /** Peinado volteado (espejo). */
  hairFlip: boolean;
  eyebrows: string;
  eyes: string;
  nose: string;
  mouth: string;
  mustache: string | null;
  beard: string | null;
  mole: boolean;
  glasses: string | null;
  /** 0 = bajo/delgado, 1 = alto/robusto. */
  height: number;
  weight: number;
  top: string;
  bottoms: string;
  shoes: string;
  colors: MiiColors;
  adjust: Adjustments;
}

/** ids numerados: ids('hair-', 3, 2) → ['hair-00', 'hair-01', 'hair-02']. */
function ids(prefix: string, count: number, digits: number): string[] {
  return Array.from({ length: count }, (_, i) => prefix + String(i).padStart(digits, '0'));
}

/** Piezas disponibles por categoría (las usa el menú de personalización). */
export const MII_CATALOG = {
  heads: ids('head-', 12, 2),
  hair: ids('hair-', 30, 3),
  eyebrows: ids('', 42, 2),
  eyes: ids('', 80, 3),
  noses: ids('nose-', 12, 2),
  mouths: ids('', 55, 3),
  mustaches: ids('', 15, 2),
  beards: ids('beard-', 13, 2),
  glasses: ids('glasses-', 19, 2),
  tops: ['tshirt-long', 'tshirt-half', 'tshirt-sleeveless', 'shirt-long', 'coat-long', 'outer-long'],
  bottoms: ['pants-long', 'pants-wide', 'skirt-box', 'skirt-long', 'skirt-mini'],
  shoes: ['sneaker', 'standard', 'boots-short', 'loafer', 'sandal', 'skate'],
};

/** Mii base "masculino": la cara clásica de Mii (pelo castaño corto, ojos negros, boca recta, ropa roja y gris). */
const BASE: MiiAppearance = {
  head: 'head-00',
  hair: 'hair-026',
  hairFlip: false,
  eyebrows: '04',
  eyes: '004',
  nose: 'nose-01',
  mouth: '049',
  mustache: null,
  beard: null,
  mole: false,
  glasses: null,
  height: 0.5,
  weight: 0.5,
  top: 'tshirt-long',
  bottoms: 'pants-long',
  shoes: 'sneaker',
  colors: {
    skin: '#fbdcbc',
    hair: '#5a3420',
    eyes: '#1c1c1c',
    mouth: '#e9b49c', // casi del color de la piel: la boca se ve como una línea
    glasses: '#303030',
    favorite: '#d93a2e',
    bottoms: '#5a5f6a',
    shoes: '#5a5f6a',
  },
  adjust: { nose: { scale: 0.85 } },
};

/** Los dos Mii de partida que se ofrecen al abrir el editor por primera vez. */
export const BASE_MIIS: MiiAppearance[] = [
  BASE,
  // Mii base "femenino": misma ropa, pelo con flequillo de lado, cejas finas y ojos con pestaña.
  { ...BASE, hair: 'hair-025', eyebrows: '27', eyes: '012' },
];

export const DEFAULT_APPEARANCE = BASE;
