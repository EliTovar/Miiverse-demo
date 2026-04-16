// three/Discord/services/DiscordService.ts
import { API_CONFIG } from '../../../../config/api.config';

export interface DiscordBot {
    id: string;
    name: string;
    votes: string;
    description: string;
    image: string;  // Widget image from Top.gg
    url: string;
}

export class DiscordService {

    async getTopBots(): Promise<DiscordBot[]> {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/discord/top-bots`);
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching top Discord bots:', e);
            return [];
        }
    }

    async getTrendingBots(): Promise<DiscordBot[]> {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/discord/trending-bots`);
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching trending Discord bots:', e);
            return [];
        }
    }
}
