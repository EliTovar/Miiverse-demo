import { Routes } from '@angular/router';
import { AdminComponent } from './admin-component';
import { MainScenario } from '../../../../three/main-scenario/main-scenario';
import { IAAdministrator } from './IA-administrator/IA-administrator';
import { SocialMediaModule } from '../../../social-media.module';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminComponent,
    children: [
      { path: 'ia', component: IAAdministrator }
    ]
  }
];