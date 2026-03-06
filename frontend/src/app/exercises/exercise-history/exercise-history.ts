import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ExerciseService, ExerciseHistory as HistoryData, HistorySession } from '../exercise.service';
import { MUSCLE_GROUP_LABELS } from '../exercise.service';

@Component({
  selector: 'app-exercise-history',
  imports: [RouterLink],
  templateUrl: './exercise-history.html',
  styleUrl: './exercise-history.scss',
})
export class ExerciseHistory implements OnInit {
  data = signal<HistoryData | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  expanded = signal<Set<string>>(new Set());

  maxSessionVolume = computed(() => {
    const sessions = this.data()?.sessions ?? [];
    return Math.max(...sessions.map(s => s.maxWeightKg), 1);
  });

  constructor(private route: ActivatedRoute, private exerciseService: ExerciseService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.exerciseService.getHistory(id).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => { this.error.set('Failed to load history.'); this.loading.set(false); },
    });
  }

  toggleSession(sessionId: string): void {
    this.expanded.update(set => {
      const next = new Set(set);
      next.has(sessionId) ? next.delete(sessionId) : next.add(sessionId);
      return next;
    });
  }

  isExpanded(sessionId: string): boolean {
    return this.expanded().has(sessionId);
  }

  muscleLabel(group: string): string {
    return MUSCLE_GROUP_LABELS[group as keyof typeof MUSCLE_GROUP_LABELS] ?? group;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  barWidth(session: HistorySession): number {
    return Math.max((session.maxWeightKg / this.maxSessionVolume()) * 100, 4);
  }
}
