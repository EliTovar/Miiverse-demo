import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MAIN_SCENARIO_ROUTES } from './main-scenario.routes';
import { MainScenario } from './main-scenario';

@NgModule({
  imports: [MainScenario, RouterModule.forChild(MAIN_SCENARIO_ROUTES)]
})
export class MainScenarioModule {}
