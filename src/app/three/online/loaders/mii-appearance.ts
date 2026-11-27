/*
 * Apariencia del Mii: qué piezas lleva y de qué color.
 *
 * Es un objeto pequeño y serializable (JSON) para poder guardarlo y enviarlo
 * por red más adelante. Los ids corresponden a archivos en
 * public/models/mii-parts/<categoría>/<id>.glb (ver tools/mii-parts/parts.json).
 */

export interface MiiColors {
  skin: string;
  hair: string;
  top: string;
  bottoms: string;
  shoes: string;
}

export interface MiiAppearance {
  head: string;
  hair: string;
  nose: string;
  top: string;
  bottoms: string;
  shoes: string;
  colors: MiiColors;
}

/** Piezas disponibles por categoría (el menú de personalización usará esta lista). */
export const MII_CATALOG = {
  heads: ['head-00', 'head-01', 'head-02', 'head-03', 'head-04', 'head-05'],
  hair: ['hair-000', 'hair-001', 'hair-002', 'hair-003', 'hair-004', 'hair-005'],
  noses: ['nose-01', 'nose-03'],
  tops: ['tshirt-long', 'tshirt-half', 'tshirt-sleeveless', 'shirt-long', 'coat-long', 'outer-long'],
  bottoms: ['pants-long', 'pants-wide', 'skirt-box', 'skirt-long', 'skirt-mini'],
  shoes: ['sneaker', 'standard', 'boots-short', 'loafer', 'sandal', 'skate'],
} as const;

export const DEFAULT_APPEARANCE: MiiAppearance = {
  head: 'head-00',
  hair: 'hair-000',
  nose: 'nose-01',
  top: 'tshirt-long',
  bottoms: 'pants-long',
  shoes: 'sneaker',
  colors: {
    skin: '#f2c9a0',
    hair: '#3b2a20',
    top: '#d94a3a',
    bottoms: '#2b3f66',
    shoes: '#f5f5f5',
  },
};
