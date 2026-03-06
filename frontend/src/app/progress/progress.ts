import { Component, OnInit, signal, computed } from '@angular/core';
import { StatsService, Stats } from './stats.service';

@Component({
  selector: 'app-progress',
  imports: [],
  templateUrl: './progress.html',
  styleUrl: './progress.scss',
})
export class Progress implements OnInit {
  stats = signal<Stats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  maxWeekCount = computed(() => {
    const w = this.stats()?.weeklyActivity ?? [];
    return Math.max(...w.map(x => x.count), 1);
  });

  maxMuscleSetCount = computed(() => {
    const m = this.stats()?.muscleGroups ?? [];
    return Math.max(...m.map(x => x.sets), 1);
  });

  maxExerciseVolume = computed(() => {
    const e = this.stats()?.topExercises ?? [];
    return Math.max(...e.map(x => x.totalVolumeKg), 1);
  });

  constructor(private statsService: StatsService) {}

  ngOnInit(): void {
    this.statsService.get().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); },
      error: () => { this.error.set('Failed to load stats.'); this.loading.set(false); },
    });
  }

  weekLabel(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  formatVolume(kg: number): string {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg.toLocaleString()} kg`;
  }

  muscleLabel(group: string): string {
    return group.replace('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
  }
}
