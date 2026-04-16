import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from "./SocialMedia/components/navbar/navbar";
import { ComposerModalComponent } from './SocialMedia/components/shared/composer-modal/composer-modal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, ComposerModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Miiverse-01';
}
