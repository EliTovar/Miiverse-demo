// three/Games/services/SteamService.ts
import { API_CONFIG } from '../../../../config/api.config';

export interface SteamGame {
    appid: number;
    name: string;
    author?: string; // Nuevo campo opcional
    image: string;
}

export class SteamService {

    async getTrendingGames(): Promise<SteamGame[]> {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/games/trending`);
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching trending games:', e);
            return [];
        }
    }

    async getRecentGames(): Promise<SteamGame[]> {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/games/recent`);
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