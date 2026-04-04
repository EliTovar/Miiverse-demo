// three/Games/services/SteamService.ts

export interface SteamGame {
    appid: number;
    name: string;
    image: string;
}

export class SteamService {

    async getTrendingGames(): Promise<SteamGame[]> {
        try {
            const res = await fetch('http://192.168.100.15:3000/games/trending');
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching trending games:', e);
            return [];
        }
    }

    async getRecentGames(): Promise<SteamGame[]> {
        try {
            const res = await fetch('http://192.168.100.15:3000/games/recent');
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching recent games:', e);
            return [];
        }
    }

    // Mantener getTopGame para compatibilidad si se usa en otros sitios
    async getTopGame(): Promise<SteamGame> {
        const games = await this.getTrendingGames();
        return games[0] || { appid: 570, name: 'Dota 2', image: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg' };
    }
}