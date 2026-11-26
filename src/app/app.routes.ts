import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '', 
    loadChildren: () =>
      import('./three/main-scenario/main-scenario.module')
        .then(m => m.MainScenarioModule)
  },

  {
    path: 'social',
    loadChildren: () =>
      import('./social/social-media.module')
        .then(m => m.SocialMediaModule)
  },

  {
    path: 'auth',
    loadChildren: () =>
      import('./social/components/auth/auth.module')
        .then(m => m.AuthModule)
  },

];
