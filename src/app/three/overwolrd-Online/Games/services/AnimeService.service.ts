// three/Games/services/AnimeService.service.ts
import { API_CONFIG } from '../../../../config/api.config';

export interface AnimeItem {
    appid: number;
    name: string;
    image: string;
}

export class AnimeService {
    async getTopAnime(): Promise<AnimeItem[]> {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/mal/anime`);
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching Top Anime:', e);
            return [];
        }
    }
}
