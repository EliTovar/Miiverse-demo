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
  return {
    head: pick(data.head, MII_CATALOG.heads, d.head),
    hair: pick(data.hair, MII_CATALOG.hair, d.hair),
    nose: pick(data.nose, MII_CATALOG.noses, d.nose),
    top: pick(data.top, MII_CATALOG.tops, d.top),
    bottoms: pick(data.bottoms, MII_CATALOG.bottoms, d.bottoms),
    shoes: pick(data.shoes, MII_CATALOG.shoes, d.shoes),
    colors: pickColors(data.colors),
  };
}

export function loadSavedAppearance(): MiiAppearance {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return sanitize(text ? JSON.parse(text) : null);
  } catch {
    return sanitize(null); // JSON roto o almacenamiento bloqueado: usar la apariencia por defecto
  }
}

export function saveAppearance(appearance: MiiAppearance): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(appearance)));
}
