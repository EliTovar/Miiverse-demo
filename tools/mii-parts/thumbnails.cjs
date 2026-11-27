/*
 * Genera las miniaturas del editor "Mi Mii" (una foto PNG por pieza 3D).
 * Uso (desde la raíz del proyecto, después de convert.cjs):
 *   node tools/mii-parts/thumbnails.cjs
 * Escribe en public/models/mii-parts/thumbs/<categoría>/<id>.webp
 * Requiere Playwright (con Chromium) disponible para Node. Ver README.md.
 */
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(PUBLIC, 'models/mii-parts/thumbs');

/** Empaqueta thumbnails-page.ts (y el código de la app que importa) en un solo .js. */
function bundle() {
  const file = path.join(os.tmpdir(), 'mii-thumbnails.js');
  execFileSync(path.join(ROOT, 'node_modules/.bin/esbuild'), [
    path.join(__dirname, 'thumbnails-page.ts'), '--bundle', `--outfile=${file}`, '--log-level=warning',
  ], { stdio: 'inherit' });
  return file;
}

/** Sirve public/ (las piezas) y la página con el bundle. */
function serve(bundleFile) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/') return res.end('<!doctype html><body style="margin:0"><script src="/bundle.js"></script>');
    const file = url === '/bundle.js' ? bundleFile : path.join(PUBLIC, url);
    if (!file.startsWith(PUBLIC) && file !== bundleFile) { res.writeHead(404); return res.end(); }
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, () => ok(server)));
}

async function main() {
  const server = await serve(bundle());
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error(e.message));
  await page.goto(`http://localhost:${server.address().port}/`);
  await page.waitForFunction('window.ready');

  const save = (category, id, base64) => {
    fs.mkdirSync(path.join(OUT, category), { recursive: true });
    fs.writeFileSync(path.join(OUT, category, `${id}.webp`), Buffer.from(base64, 'base64'));
  };
  // El catálogo y los Mii base salen del mismo código de la app (ver thumbnails-page.ts).
  const { catalog, base, bases } = await page.evaluate('window.data');

  // categoría de la miniatura → [campo de la apariencia, lista de ids, vista, ocultar pelo]
  const jobs = {
    heads: ['head', catalog.heads, 'face', true],
    hair: ['hair', catalog.hair, 'hair', false],
    noses: ['nose', catalog.noses, 'face', true],
    beards: ['beard', catalog.beards, 'beard', true],
    glasses: ['glasses', catalog.glasses, 'face', true],
    tops: ['top', catalog.tops, 'top', false],
    bottoms: ['bottoms', catalog.bottoms, 'bottoms', false],
    shoes: ['shoes', catalog.shoes, 'shoes', false],
  };
  for (const [category, [field, ids, view, hideHair]] of Object.entries(jobs)) {
    for (const id of ids) {
      save(category, id, await page.evaluate(([a, v, h]) => window.thumb(a, v, h), [{ ...base, [field]: id }, view, hideHair]));
    }
    console.log(`thumbs/${category}: ${ids.length}`);
  }
  for (const [i, mii] of bases.entries()) save('base', String(i), await page.evaluate((a) => window.thumb(a, 'body'), mii));
  save('mannequin', 'face', await page.evaluate(() => window.mannequinThumb('face')));
  console.log('thumbs/base y thumbs/mannequin listos');

  await browser.close();
  server.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
