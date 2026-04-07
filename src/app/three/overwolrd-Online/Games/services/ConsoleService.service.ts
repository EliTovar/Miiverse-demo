import { Injectable } from '@angular/core';

export interface ConsoleGame {
    appid: number;
    name: string;
    image: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConsoleService {

    async getPlaystationGames(): Promise<ConsoleGame[]> {
        try {
            const res = await fetch('http://192.168.100.15:3000/consoles/playstation');
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching PlayStation games:', e);
            return [];
        }
    }

    async getXboxGames(): Promise<ConsoleGame[]> {
        try {
            const res = await fetch('http://192.168.100.15:3000/consoles/xbox');
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching Xbox games:', e);
            return [];
        }
    }

    async getNintendoSwitchGames(): Promise<ConsoleGame[]> {
        try {
            const res = await fetch('http://192.168.100.15:3000/consoles/switch');
            return await res.json();
        } catch (e) {
            console.error('❌ Error fetching Switch games:', e);
            return [];
        }
    }
}
