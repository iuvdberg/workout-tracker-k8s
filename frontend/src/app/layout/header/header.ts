import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth';
import { ThemeService } from '../../theme/theme';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  menuOpen = signal(false);

  constructor(public auth: AuthService, public theme: ThemeService, private router: Router) {
    this.router.events.subscribe(() => this.menuOpen.set(false));
  }

  toggleMenu(): void {
    this.menuOpen.update(v => !v);
  }
}
