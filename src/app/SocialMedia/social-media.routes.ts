import { Routes } from '@angular/router';
import { SocialMedia } from './SocialMedia';
import { AuthGuard } from './guards/auth.guard';
import { CreatePost } from './components/create-post/create-post';
import { AdminComponent } from './components/admin/admin-component/admin-component';
import { IAAdministrator } from './components/admin/admin-component/IA-administrator/IA-administrator';
import { AdministratorPanel } from './components/admin/admin-component/Administrator-panel/Administrator-panel';
import { MiiverseFeed } from './components/miiverse-feed/miiverse-feed';

export const SOCIAL_MEDIA_ROUTES: Routes = [
    { 
        path: '', 
        component: MiiverseFeed 
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
    children: [
      { path: 'world', component: AdministratorPanel },
      { path: 'ia', component: IAAdministrator },
      { path: '', redirectTo: 'world', pathMatch: 'full' }
    ]
  }
];
