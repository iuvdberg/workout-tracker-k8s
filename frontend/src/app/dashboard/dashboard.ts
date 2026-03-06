import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth';
import { SessionService, WorkoutSession } from '../sessions/session.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  recentSessions = signal<WorkoutSession[]>([]);
  firstName = computed(() => this.auth.user()?.name?.split(' ')[0] ?? '');

  constructor(public auth: AuthService, private sessionService: SessionService) {}

  ngOnInit(): void {
    this.sessionService.list().subscribe({
      next: list => this.recentSessions.set(list.slice(0, 5)),
      error: () => {},
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatDuration(startedAt: string, completedAt: string | null): string {
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const mins = Math.round((end - start) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
}
