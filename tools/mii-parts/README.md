# Piezas del Mii (conversión DAE → GLB)

Herramienta de desarrollo (no forma parte de la app). Convierte las piezas del Mii de
*Tomodachi Life: Living the Dream* (zip "Playable Characters - Mii" de The Models Resource)
en archivos GLB que la app carga desde `public/models/mii-parts/`.

## Qué hace

- Lee `parts.json`: qué archivo DAE corresponde a cada id (`tops/tshirt-long`, `hair/hair-000`…).
- Recupera los nombres reales de los huesos (`ColladaLoader` los deja como `joint0`, `joint1`…).
  Sin esto la ropa no encontraría los huesos del cuerpo.
- Deja cada pieza con material blanco (la app la tiñe) y geometría indexada (pesa ~3 veces menos).
- Cabeza, pelo y nariz se guardan como mallas rígidas (cuelgan del hueso `Head`).
- Genera `faces/face-default.png` (ojos + boca) para la malla `Mask` de la cabeza.

## Uso

1. Descomprime el zip y localiza la carpeta `Mii` (contiene `BodyBaseDefault.dae`, `Cloth/`, `MiiHead/`…).
2. Ten Playwright con Chromium disponible para Node (`npm i -D playwright && npx playwright install chromium`,
   o una instalación global). No está en `package.json` porque solo se usa aquí.
3. Ejecuta desde la raíz del proyecto:

   ```bash
   node tools/mii-parts/convert.cjs "C:/ruta/a/Mii"
   ```

Para añadir piezas: agrégalas a `parts.json`, vuelve a ejecutar el script y añade el id a
`MII_CATALOG` en `src/app/three/online/loaders/mii-appearance.ts`.

## Licencia

Los modelos son contenido de Nintendo extraído del juego (ripeo de Centrixe en The Models Resource).
Solo para uso personal/de estudio: no publicar ni usar comercialmente.
