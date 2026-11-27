import { Routes } from '@angular/router';
import { AuthGuard } from '../core/auth/auth.guard';
import { AdminComponent } from './components/admin/admin-component/admin-component';
import { IAAdministrator } from './components/admin/admin-component/IA-administrator/IA-administrator';
import { AdministratorPanel } from './components/admin/admin-component/Administrator-panel/Administrator-panel';
import { MiiverseFeed } from './components/miiverse-feed/miiverse-feed';
import { MiiverseLayout } from './components/miiverse-layout/miiverse-layout';
import { Communities } from './components/communities/communities';
import { Community } from './components/community/community';
import { PostDetail } from './components/post-detail/post-detail';
import { UserProfile } from './components/user-profile/user-profile';
import { Search } from './components/search/search';
import { Moderation } from './components/moderation/moderation';
import { AdminPanel } from './components/admin-panel/admin-panel';
import { MiiEditor } from './components/mii-editor/mii-editor';

export const SOCIAL_MEDIA_ROUTES: Routes = [
  {
    // Marco estilo Wii U (menú lateral + barra verde) para las secciones de la red social.
    path: '',
    component: MiiverseLayout,
    children: [
      { path: '', component: MiiverseFeed, data: { title: 'Actividad', showPostButton: true } },
      { path: 'search', component: Search, data: { title: 'Buscar' } },
      { path: 'mii', component: MiiEditor, canActivate: [AuthGuard], data: { title: 'Mi Mii', wide: true } },
      {
        path: 'panel',
        component: AdminPanel,
        canActivate: [AuthGuard],
        data: { title: 'Administración', roles: ['admin'] },
      },
      {
        path: 'moderation',
        component: Moderation,
        canActivate: [AuthGuard],
        data: { title: 'Moderación', roles: ['admin'], wide: true },
      },
      { path: 'communities', component: Communities, data: { title: 'Comunidades' } },
      { path: 'communities/:name', component: Community, data: { title: 'Comunidad' } },
      { path: 'posts/:id', component: PostDetail, data: { title: 'Publicación' } },
      { path: 'users/:username', component: UserProfile, data: { title: 'Perfil' } },
    ],
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
