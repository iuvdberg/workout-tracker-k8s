import { Component, OnInit, signal } from '@angular/core';
import { AuthService } from '../../auth/auth';
import { UserService, AdminUser } from '../user.service';

@Component({
  selector: 'app-admin-users',
  imports: [],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class AdminUsers implements OnInit {
  users = signal<AdminUser[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  updating = signal<string | null>(null); // id of user being updated

  constructor(public auth: AuthService, private userService: UserService) {}

  ngOnInit(): void {
    this.userService.list().subscribe({
      next: list => { this.users.set(list); this.loading.set(false); },
      error: () => { this.error.set('Failed to load users.'); this.loading.set(false); },
    });
  }

  toggleRole(user: AdminUser): void {
    const newRole = user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    this.updating.set(user.id);
    this.userService.setRole(user.id, newRole).subscribe({
      next: updated => {
        this.users.update(list => list.map(u => u.id === updated.id ? { ...u, ...updated } : u));
        this.updating.set(null);
      },
      error: () => { this.error.set('Failed to update role.'); this.updating.set(null); },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  isCurrentUser(user: AdminUser): boolean {
    return user.id === this.auth.user()?.id;
  }
}
