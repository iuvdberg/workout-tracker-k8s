import { Component } from '@angular/core';
import { AuthService } from '../auth';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  constructor(private auth: AuthService) {}

  loginWithGoogle(): void {
    this.auth.loginWithGoogle();
  }
}
