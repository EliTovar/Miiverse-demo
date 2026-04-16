// three/Games/services/MangaService.service.ts
import { API_CONFIG } from '../../../../config/api.config';

export interface MangaItem {
    appid: number;
    name: string;
    image: string;
}

export class MangaService {
    async getTopManga(): Promise<MangaItem[]> {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/mal/manga`);
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching Top Manga:', e);
            return [];
        }
    }
}
