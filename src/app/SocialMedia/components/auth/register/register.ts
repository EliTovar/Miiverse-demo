import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

@Component({
  selector: 'app-register',
  imports: [],
  templateUrl: './register.html',
  styleUrl: './register.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent { 
  private http = inject(HttpClient);

  username= '';
  email = '';
  password = '';

  register() {
    this.http.post('http://localhost:3000/auth/register', {
      username: this.username,
      email: this.email,
      password: this.password,
    }).subscribe(() => {
      alert('Cuenta Creada, ahora inicia sesión');
    });
  }
}
