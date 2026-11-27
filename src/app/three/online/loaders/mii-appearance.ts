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

export interface MiiAppearance {
  head: string;
  hair: string;
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

const BASE: MiiAppearance = {
  head: 'head-00',
  hair: 'hair-000',
  eyebrows: '00',
  eyes: '000',
  nose: 'nose-01',
  mouth: '000',
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
    skin: '#f2c9a0',
    hair: '#3b2a20',
    eyes: '#4a3020',
    mouth: '#d0605a',
    glasses: '#303030',
    favorite: '#d94a3a',
    bottoms: '#2b3f66',
    shoes: '#f5f5f5',
  },
};

/** Los dos Mii de partida que se ofrecen al abrir el editor por primera vez. */
export const BASE_MIIS: MiiAppearance[] = [
  BASE,
  {
    ...BASE,
    hair: 'hair-003',
    eyes: '001',
    mouth: '001',
    bottoms: 'skirt-box',
    shoes: 'loafer',
    colors: { ...BASE.colors, hair: '#6b3a1e', favorite: '#e07aa0', bottoms: '#3a3a4a', shoes: '#5a2e1e' },
  },
];

export const DEFAULT_APPEARANCE = BASE;
