import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from "./SocialMedia/components/navbar/navbar";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Miiverse-01';
}
