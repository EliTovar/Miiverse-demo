import { API_CONFIG, backendUrl } from '../../../../core/config/api.config';
import { SteamGame } from './SteamService.service';

/** Un jugador del ranking semanal, tal como lo devuelve el backend. */
interface TopPlayer {
  username: string;
  yeahs: number;
  posts_count: number;
  avatar_url: string | null;
  top_post_id: number;
  top_drawing_url: string | null;
}

/**
 * Top Players: los 5 usuarios con más Yeahs recibidos en sus publicaciones
 * (dibujos o texto) durante la semana actual, de lunes a domingo en la hora
 * local de quien mira. Lo calcula el backend (GET /miiverse/top-players).
 */
export class TopPlayersService {

    /**
     * Devuelve el ranking con la forma que usa el billboard (SteamGame).
     * Si la petición falla lanza un error, para que el billboard muestre
     * "Error de Red" y no lo confunda con una semana sin Yeahs.
     */
    async getWeeklyTopPlayers(): Promise<SteamGame[]> {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch(`${API_CONFIG.MIIVERSE_URL}/top-players?tz=${encodeURIComponent(tz)}`);
        if (!res.ok) throw new Error(`top-players respondió ${res.status}`);
        const data: { players: TopPlayer[] } = await res.json();

        return data.players.map(player => ({
            appid: player.top_post_id,
            name: player.username,
            author: `${player.yeahs} Yeah${player.yeahs === 1 ? '' : 's'} esta semana`,
            // Su dibujo más votado de la semana; si no tiene, su avatar (vía el
            // proxy del backend, igual que las demás imágenes de los billboards).
            image: backendUrl(player.top_drawing_url)
                ?? `${API_CONFIG.BASE_URL}/games/proxy?url=${encodeURIComponent(player.avatar_url ?? '')}`,
        }));
    }
}
