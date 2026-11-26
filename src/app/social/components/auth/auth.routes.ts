import { Routes } from "@angular/router";
import { LoginComponent } from "./login/login";
import { RegisterComponent } from "./register/register";
import { MiiverseLayout } from "../miiverse-layout/miiverse-layout";

export const authRoutes: Routes = [
    {
        // Login y registro usan el mismo marco estilo Wii U que la red social.
        path: '',
        component: MiiverseLayout,
        children: [
            { path: 'login', component: LoginComponent, data: { title: 'Iniciar sesión' } },
            { path: 'register', component: RegisterComponent, data: { title: 'Crear cuenta' } },
        ],
    },
];
