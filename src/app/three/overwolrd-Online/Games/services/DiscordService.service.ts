// three/Discord/services/DiscordService.ts

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
            const res = await fetch('http://192.168.100.15:3000/discord/top-bots');
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching top Discord bots:', e);
            return [];
        }
    }

    async getTrendingBots(): Promise<DiscordBot[]> {
        try {
            const res = await fetch('http://192.168.100.15:3000/discord/trending-bots');
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching trending Discord bots:', e);
            return [];
        }
    }
}
