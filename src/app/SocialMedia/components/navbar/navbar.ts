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
                icon: 'pi pi-home',
                routerLink: '/'
            },
            {
                label: 'MiiVerse',
                icon: 'pi pi-star',
                routerLink: '/social'
            },
            {
                label: 'Actions',
                icon: 'pi pi-forward',
                items: [
                    {
                        label: 'Saludar',
                        icon: 'pi pi-face-smile'
                    },
                    {
                        label: 'auto-caminar',
                        icon: 'pi pi-bolt'
                    },
                    {
                        label: 'sentarse',
                        icon: 'pi pi-moon'
                    },
                    {
                        label: 'tarjetas',
                        icon: 'pi pi-credit-card',
                        items: [
                            {
                                label: 'recolectar',
                                icon: 'pi pi-star-fill'
                            },
                            {
                                label: 'repartir',
                                icon: 'pi pi-send'
                            }
                        ]
                    }
                ]
            },
            {
                label: 'Cards',
                icon: 'pi pi-images'
            },
            {
                label: 'Chat',
                icon: 'pi pi-comments'
            }
        ]
    }
}