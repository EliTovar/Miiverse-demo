// Dirección del backend.
// Se usa el mismo host desde el que se abrió la página: con `localhost:4200`
// apunta a `localhost:3000`, y desde otro equipo de la red (`192.168.x.x:4200`)
// apunta a esa misma IP. Así no hay que editar este archivo al cambiar de red.
const API_HOST = `http://${window.location.hostname}:3000`;

export const API_CONFIG = {
  BASE_URL: API_HOST,
  SOCKET_URL: API_HOST,
  MIIVERSE_URL: `${API_HOST}/miiverse`,
};

/**
 * Completa las rutas que manda el backend (por ejemplo el dibujo de un post,
 * `/miiverse/posts/7/drawing`) con su dirección. Las data URL y las URL
 * completas se devuelven tal cual.
 */
export function backendUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? API_HOST + url : url;
}
