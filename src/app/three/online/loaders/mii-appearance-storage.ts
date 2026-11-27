import { DEFAULT_APPEARANCE, MII_CATALOG, MiiAppearance, MiiColors } from './mii-appearance';

/*
 * Guarda la apariencia del Mii en el navegador (localStorage).
 *
 * Es temporal: más adelante se guardará en el backend para que los demás
 * jugadores vean tu Mii. Por ahora es una por navegador (no por usuario).
 */

const STORAGE_KEY = 'mii-appearance';
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Devuelve el valor si existe en la lista; si no, el de respaldo (datos viejos o editados a mano). */
function pick(value: unknown, options: readonly string[], fallback: string): string {
  return typeof value === 'string' && options.includes(value) ? value : fallback;
}

/** Igual que `pick`, pero la pieza es opcional (`null` = sin bigote, sin lentes…). */
function pickOptional(value: unknown, options: readonly string[]): string | null {
  return typeof value === 'string' && options.includes(value) ? value : null;
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && value >= 0 && value <= 1 ? value : fallback;
}

function pickColors(value: unknown): MiiColors {
  const saved = (value ?? {}) as Partial<Record<keyof MiiColors, unknown>>;
  const colors = { ...DEFAULT_APPEARANCE.colors };
  for (const key of Object.keys(colors) as (keyof MiiColors)[]) {
    const color = saved[key];
    if (typeof color === 'string' && HEX_COLOR.test(color)) colors[key] = color;
  }
  return colors;
}

/** Valida cada campo: lo que viene de localStorage no es de fiar. */
function sanitize(raw: unknown): MiiAppearance {
  const data = (raw ?? {}) as Partial<Record<keyof MiiAppearance, unknown>>;
  const d = DEFAULT_APPEARANCE;
  const c = MII_CATALOG;
  return {
    head: pick(data.head, c.heads, d.head),
    hair: pick(data.hair, c.hair, d.hair),
    eyebrows: pick(data.eyebrows, c.eyebrows, d.eyebrows),
    eyes: pick(data.eyes, c.eyes, d.eyes),
    nose: pick(data.nose, c.noses, d.nose),
    mouth: pick(data.mouth, c.mouths, d.mouth),
    mustache: pickOptional(data.mustache, c.mustaches),
    beard: pickOptional(data.beard, c.beards),
    mole: data.mole === true,
    glasses: pickOptional(data.glasses, c.glasses),
    height: pickNumber(data.height, d.height),
    weight: pickNumber(data.weight, d.weight),
    top: pick(data.top, c.tops, d.top),
    bottoms: pick(data.bottoms, c.bottoms, d.bottoms),
    shoes: pick(data.shoes, c.shoes, d.shoes),
    colors: pickColors(data.colors),
  };
}

/** Apariencia guardada, o `null` si el usuario todavía no ha creado su Mii (se usa el maniquí). */
export function loadSavedAppearance(): MiiAppearance | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? sanitize(JSON.parse(text)) : null;
  } catch {
    return null; // JSON roto o almacenamiento bloqueado: maniquí
  }
}

export function saveAppearance(appearance: MiiAppearance): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(appearance)));
}
