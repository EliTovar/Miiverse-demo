import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Menubar } from 'primeng/menubar';


@Component({
  selector: 'app-navbar',
  imports: [Menubar],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  standalone: true,
})
export class Navbar implements OnInit {
    items: MenuItem[] | undefined;

    ngOnInit() {
        this.items = [
            {
                label: 'Home',
                icon: 'pi pi-home'
            },
            {
                label: 'MiiVerse',
                icon: 'pi pi-star'
            },
            {
                label: 'Actions',
                icon: 'pi pi-forward',
                items: [
                    {
                        label: 'Saludar',
                        icon: 'pi pi-bolt'
                    },
                    {
                        label: 'auto-caminar',
                        icon: 'pi pi-server'
                    },
                    {
                        label: 'sentarse',
                        icon: 'pi pi-pencil'
                    },
                    {
                        label: 'tarjetas',
                        icon: 'pi pi-palette',
                        items: [
                            {
                                label: 'recolectar',
                                icon: 'pi pi-palette'
                            },
                            {
                                label: 'repartir',
                                icon: 'pi pi-palette'
                            }
                        ]
                    }
                ]
            },
            {
                label: 'Chat',
                icon: 'pi pi-comment'
            }
        ]
    }
}