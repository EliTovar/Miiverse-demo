// three/Games/services/PixivService.service.ts

export interface PixivItem {
    appid: number;
    name: string;
    image: string;
}

export class PixivService {
    async getDailyRanking(): Promise<PixivItem[]> {
        try {
            const res = await fetch('http://192.168.100.15:3000/pixiv/daily');
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching Pixiv Ranking:', e);
            return [];
        }
    }
}
