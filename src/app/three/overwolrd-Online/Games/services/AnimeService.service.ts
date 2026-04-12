// three/Games/services/AnimeService.service.ts

export interface AnimeItem {
    appid: number;
    name: string;
    image: string;
}

export class AnimeService {
    async getTopAnime(): Promise<AnimeItem[]> {
        try {
            const res = await fetch('http://192.168.100.15:3000/mal/anime');
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching Top Anime:', e);
            return [];
        }
    }
}
