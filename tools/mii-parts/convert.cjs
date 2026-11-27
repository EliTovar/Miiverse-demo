/*
 * Convierte las piezas del Mii (Tomodachi Life: Living the Dream, formato DAE) a GLB.
 * Uso:  node tools/mii-parts/convert.cjs <carpeta "Mii" descomprimida>
 * Lee parts.json y escribe en public/models/mii-parts/<categoría>/<id>.glb
 * Requiere Playwright (con Chromium) disponible para Node. Ver README.md.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'public/models/mii-parts');
const THREE_DIR = path.join(ROOT, 'node_modules/three');
const RIGID = new Set(['heads', 'hair', 'noses']); // piezas que cuelgan del hueso Head
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.dae': 'model/vnd.collada+xml' };

const srcDir = process.argv[2];
if (!srcDir || !fs.existsSync(srcDir)) {
  console.error('Indica la carpeta "Mii" descomprimida. Ej: node tools/mii-parts/convert.cjs ~/Downloads/Mii');
  process.exit(1);
}
const parts = JSON.parse(fs.readFileSync(path.join(__dirname, 'parts.json'), 'utf8'));

/** Servidor estático mínimo: /src → piezas originales, /three → Three.js del proyecto. */
function serve() {
  const routes = { '/src/': path.resolve(srcDir), '/three/': THREE_DIR, '/': __dirname };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const prefix = Object.keys(routes).find((p) => url.startsWith(p));
    const file = path.join(routes[prefix], url.slice(prefix.length));
    if (!file.startsWith(routes[prefix]) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, () => ok(server)));
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error('Error en la página:', e.message));
    await page.goto(`http://localhost:${server.address().port}/convert-page.html`);
    await page.waitForFunction('window.ready');

    for (const [category, items] of Object.entries(parts)) {
      if (category === 'face') continue;
      fs.mkdirSync(path.join(OUT, category), { recursive: true });
      for (const [id, src] of Object.entries(items)) {
        const b64 = await page.evaluate(([s, r]) => window.convertPart(s, r), [src, RIGID.has(category)]);
        const file = path.join(OUT, category, `${id}.glb`);
        fs.writeFileSync(file, Buffer.from(b64, 'base64'));
        console.log(`${category}/${id}.glb  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
      }
    }

    const face = await page.evaluate(([e, m]) => window.buildFace(e, m), [parts.face.eye, parts.face.mouth]);
    fs.mkdirSync(path.join(OUT, 'faces'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'faces/face-default.png'), Buffer.from(face, 'base64'));
    console.log('faces/face-default.png');
  } finally {
    await browser.close();
    server.close();
  }
})();
