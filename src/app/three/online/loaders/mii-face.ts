/*
 * Dibuja la cara del Mii (ojos, cejas, boca, bigote, lunar) en un canvas.
 *
 * Las texturas del juego usan los canales de color como "máscaras":
 *   Ojos:  negro = contorno/pupila, verde = blanco del ojo, azul = iris, rojo = párpado (no se dibuja).
 *   Bocas: rojo = labios, verde = labio superior, azul = dientes, negro = contorno.
 *   Cejas, bigotes y lunar: blanco sobre negro = forma (se pinta con el color elegido).
 * Ojos, cejas y bigote vienen solo de un lado: el otro lado es su reflejo.
 */

import { MiiAppearance } from './mii-appearance';

const FACE_PATH = 'models/mii-parts/face';
const SIZE = 512; // la textura de la cara es de 512×512

/** Dónde va cada parte (en fracciones del canvas) y su tamaño. Ajustado a ojo sobre la malla "Mask". */
const LAYOUT = {
  eyes: { x: 0.36, y: 0.5, scale: 0.55 },
  eyebrows: { x: 0.64, y: 0.4, scale: 0.7 }, // la textura es la ceja del lado derecho de la imagen
  mouth: { x: 0.5, y: 0.71, scale: 0.55 },
  mustache: { y: 0.665, scale: 0.35 },
  mole: { x: 0.64, y: 0.66, scale: 0.15 },
};

type Rgba = [number, number, number, number];
const TRANSPARENT: Rgba = [0, 0, 0, 0];

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** Carga cada textura una sola vez. */
function loadFaceImage(type: string, id: string): Promise<HTMLImageElement> {
  const url = `${FACE_PATH}/${type}/${id}.png`;
  let promise = imageCache.get(url);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
      image.src = url;
    });
    imageCache.set(url, promise);
  }
  return promise;
}

function hexToRgba(hex: string, alpha = 255): Rgba {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

/** Mezcla los colores según cuánto rojo/verde/azul tiene cada píxel (sobre una base para el negro). */
function recolorChannels(image: HTMLImageElement, base: Rgba, r: Rgba, g: Rgba, b: Rgba): HTMLCanvasElement {
  return transform(image, (d, i) => {
    let out = base;
    for (const [weight, color] of [[d[i] / 255, r], [d[i + 1] / 255, g], [d[i + 2] / 255, b]] as const) {
      out = out.map((v, j) => v * (1 - weight) + color[j] * weight) as Rgba;
    }
    return [out[0], out[1], out[2], out[3] * (d[i + 3] / 255)];
  });
}

/** Máscara blanca sobre negro → forma pintada de un color, con transparencia. */
function recolorMask(image: HTMLImageElement, color: string): HTMLCanvasElement {
  const [r, g, b] = hexToRgba(color);
  return transform(image, (d, i) => [r, g, b, d[i] * (d[i + 3] / 255)]);
}

function transform(image: HTMLImageElement, pixel: (d: Uint8ClampedArray, i: number) => number[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) data.data.set(pixel(data.data, i), i);
  ctx.putImageData(data, 0, 0);
  return canvas;
}

/** Dibuja una pieza centrada en (x, y) y, si `mirror`, también su reflejo al otro lado de la cara. */
function drawPair(ctx: CanvasRenderingContext2D, part: HTMLCanvasElement, x: number, y: number, scale: number, mirror: boolean) {
  const w = part.width * scale;
  const h = part.height * scale;
  ctx.drawImage(part, SIZE * x - w / 2, SIZE * y - h / 2, w, h);
  if (!mirror) return;
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(part, -(SIZE * (1 - x) + w / 2), SIZE * y - h / 2, w, h);
  ctx.restore();
}

/** Recolorea una textura de ojos o de boca. */
function paintEyes(image: HTMLImageElement, color: string) {
  return recolorChannels(image, [20, 20, 20, 255], TRANSPARENT, [255, 255, 255, 255], hexToRgba(color));
}

function paintMouth(image: HTMLImageElement, color: string) {
  const lips = hexToRgba(color);
  const upper = lips.map((v, i) => (i < 3 ? v * 0.8 : v)) as Rgba;
  return recolorChannels(image, [30, 20, 20, 255], lips, upper, [255, 255, 255, 255]);
}

/** Compone la textura de la cara (la de la malla "Mask") a partir de la apariencia. */
export async function drawFace(face: MiiAppearance): Promise<HTMLCanvasElement> {
  const { colors } = face;
  const [eyes, eyebrows, mouth, mustache, mole] = await Promise.all([
    loadFaceImage('eyes', face.eyes),
    loadFaceImage('eyebrows', face.eyebrows),
    loadFaceImage('mouths', face.mouth),
    face.mustache ? loadFaceImage('mustaches', face.mustache) : null,
    face.mole ? loadFaceImage('moles', '01') : null,
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  const { eyes: e, eyebrows: b, mouth: m, mustache: s, mole: o } = LAYOUT;
  drawPair(ctx, recolorMask(eyebrows, colors.hair), b.x, b.y, b.scale, true);
  drawPair(ctx, paintEyes(eyes, colors.eyes), e.x, e.y, e.scale, true);
  drawPair(ctx, paintMouth(mouth, colors.mouth), m.x, m.y, m.scale, false);
  if (mustache) {
    // El bigote es la mitad izquierda: su borde derecho va en el centro de la cara.
    const half = recolorMask(mustache, colors.hair);
    const x = 0.5 - (half.width * s.scale) / SIZE / 2;
    drawPair(ctx, half, x, s.y, s.scale, true);
  }
  if (mole) drawPair(ctx, recolorMask(mole, '#3a2a22'), o.x, o.y, o.scale, false);
  return canvas;
}

export type FacePartType = 'eyes' | 'eyebrows' | 'mouths' | 'mustaches';

/** Miniatura (data URL) de una pieza de la cara para el menú de personalización. */
export async function facePartThumbnail(type: FacePartType, id: string, color: string): Promise<string> {
  const image = await loadFaceImage(type, id);
  if (type === 'eyes') return paintEyes(image, color).toDataURL();
  if (type === 'mouths') return paintMouth(image, color).toDataURL();
  const part = recolorMask(image, color);
  if (type === 'eyebrows') return part.toDataURL();
  // Bigote: la textura es solo la mitad izquierda; se completa con su reflejo.
  const canvas = document.createElement('canvas');
  canvas.width = part.width * 2;
  canvas.height = part.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(part, 0, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(part, -canvas.width, 0);
  return canvas.toDataURL();
}
