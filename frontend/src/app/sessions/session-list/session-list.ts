import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService, WorkoutSession } from '../session.service';

@Component({
  selector: 'app-session-list',
  imports: [RouterLink],
  templateUrl: './session-list.html',
  styleUrl: './session-list.scss',
})
export class SessionList implements OnInit {
  sessions = signal<WorkoutSession[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private sessionService: SessionService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.sessionService.list().subscribe({
      next: list => { this.sessions.set(list); this.loading.set(false); },
      error: () => { this.error.set('Failed to load sessions.'); this.loading.set(false); },
    });
  }

  delete(session: WorkoutSession): void {
    if (!confirm(`Delete "${session.name}"?`)) return;
    this.sessionService.delete(session.id).subscribe({
      next: () => this.sessions.update(list => list.filter(s => s.id !== session.id)),
      error: () => this.error.set('Failed to delete session.'),
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
