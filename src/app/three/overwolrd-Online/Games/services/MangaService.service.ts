// three/Games/services/MangaService.service.ts

export interface MangaItem {
    appid: number;
    name: string;
    image: string;
}

export class MangaService {
    async getTopManga(): Promise<MangaItem[]> {
        try {
            const res = await fetch('http://192.168.100.15:3000/mal/manga');
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching Top Manga:', e);
            return [];
        }
    }
}
