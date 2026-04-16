// three/Games/services/PixivService.service.ts
import { API_CONFIG } from '../../../../config/api.config';

export interface PixivItem {
    appid: number;
    name: string;
    image: string;
}

export class PixivService {
    async getDailyRanking(): Promise<PixivItem[]> {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/pixiv/daily`);
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching Pixiv Ranking:', e);
            return [];
        }
    }
}
