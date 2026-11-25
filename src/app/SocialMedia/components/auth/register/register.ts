import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { API_CONFIG } from '../../../../config/api.config';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink], // Necesario para [(ngModel)]
  templateUrl: './register.html',
  styleUrl: '../auth-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private http = inject(HttpClient);
  private router = inject(Router);

  username = '';
  email = '';
  password = '';
  // Signal: con OnPush, actualizar el mensaje desde la respuesta HTTP refresca la vista.
  error = signal('');

  register() {
    this.error.set('');

    if (!this.username.trim() || !this.email.trim() || !this.password) {
      this.error.set('Rellena todos los campos');
      return;
    }

    this.http.post(`${API_CONFIG.BASE_URL}/auth/register`, {
      username: this.username.trim(),
      email: this.email.trim(),
      password: this.password,
    }).subscribe({
      next: () => {
        alert('Cuenta creada, ahora inicia sesión');
        this.router.navigate(['/auth/login']);
      },
      error: (err: HttpErrorResponse) => {
        // El backend responde 409 si el email ya existe y 400 si faltan datos.
        this.error.set(err.error?.message ?? 'No se pudo crear la cuenta');
      },
    });
  }
}
