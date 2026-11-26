// three/Games/services/SpotifyService.service.ts
import { API_CONFIG } from '../../../../core/config/api.config';

export interface SpotifySong {
    appid: number;
    name: string;
    image: string;
}

export class SpotifyService {

    async getTopSongs(): Promise<SpotifySong[]> {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/spotify/top5`);
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching Spotify top songs:', e);
            // Fallback local en caso de error de conexión
            return [
                { appid: 5001, name: 'Lady Gaga & Bruno Mars - Die With A Smile', image: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/3d/0d/1b/3d0d1b6e-6e8e-c3c2-40f4-5f5f5f5f5f5f/24UMGIM74567.rgb.jpg/600x600bb.jpg' },
                { appid: 5002, name: 'Billie Eilish - BIRDS OF A FEATHER', image: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/a3/0d/1b/a30d1b6e-6e8e-c3c2-40f4-5f5f5f5f5f5f/24UMGIM74567.rgb.jpg/600x600bb.jpg' }
            ];
        }
    }
}
