import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TokenStorage } from './token-storage';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MEMBER';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(null);

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  constructor(
    private http: HttpClient,
    private router: Router,
    private tokenStorage: TokenStorage,
  ) {}

  /** Called once on app startup to restore session if a token exists. */
  init(): Promise<void> {
    if (!this.tokenStorage.isPresent()) return Promise.resolve();

    return new Promise(resolve => {
      this.http.get<User>(`${environment.apiUrl}/auth/me`).subscribe({
        next: user => { this._user.set(user); resolve(); },
        error: () => { this.tokenStorage.clear(); resolve(); },
      });
    });
  }

  /** Redirect the browser to the backend Google OAuth flow. */
  loginWithGoogle(): void {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }

  /** Called by the callback page after Google redirects back with a token. */
  handleCallback(token: string): void {
    this.tokenStorage.set(token);
    this.http.get<User>(`${environment.apiUrl}/auth/me`).pipe(
      tap(user => this._user.set(user)),
    ).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => { this.tokenStorage.clear(); this.router.navigate(['/login']); },
    });
  }

  logout(): void {
    this.tokenStorage.clear();
    this._user.set(null);
    this.router.navigate(['/login']);
  }
}
