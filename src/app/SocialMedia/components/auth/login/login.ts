import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SocialMediaServicie, Role } from '../../../services/social-media.service';
import { SocketService } from '../../../services/socket.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // 🔥 OBLIGATORIO para ngModel
  ],
  templateUrl: './login.html',
})
export class LoginComponent {
  private http = inject(HttpClient);
  private auth = inject(SocialMediaServicie);
  private router = inject(Router);
  private socketService = inject(SocketService);


  email = '';
  password = '';
  error = '';

  login() {
    this.http
      .post<{ access_token: string }>('http://192.168.100.15:3000/auth/login', {
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (res) => {
          const payload = JSON.parse(atob(res.access_token.split('.')[1]));
          const role = payload.role as Role;

          this.auth.login(res.access_token, role);

          this.socketService.connect(); // Asegurar conexión
          this.socketService.authenticate(res.access_token); // 🔥 Re-identificar jugador

          this.router.navigate([role === 'admin' ? '/social/admin' : '']);
        },
        error: () => {
          this.error = 'Credenciales inválidas';
        },
      });
  }
}
