import { Routes } from '@angular/router';
import { SocialMedia } from './SocialMedia';
import { AuthGuard } from './guards/auth.guard';
import { CreatePost } from './components/create-post/create-post';
import { AdminComponent } from './components/admin/admin-component/admin-component';

export const SOCIAL_MEDIA_ROUTES: Routes = [
    { 
        path: '', 
        component: SocialMedia 
    },
    {
    path: 'create-post',
    component: CreatePost,
    canActivate: [AuthGuard],
    data: { roles: ['user', 'admin'] },
    },
    {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AuthGuard],
    data: { roles: ['admin'] },
    }

];
