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
      import('./SocialMedia/social-media.module')
        .then(m => m.SocialMediaModule)
  }
];
