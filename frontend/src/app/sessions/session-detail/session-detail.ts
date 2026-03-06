import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService, WorkoutSession, SessionExercise } from '../session.service';
import { ExerciseService, Exercise, HistorySet } from '../../exercises/exercise.service';

interface SetDraft {
  sessionExerciseId: string;
  reps: number | null;
  weightKg: number | null;
}

@Component({
  selector: 'app-session-detail',
  imports: [FormsModule, RouterLink],
  templateUrl: './session-detail.html',
  styleUrl: './session-detail.scss',
})
export class SessionDetail implements OnInit {
  session = signal<WorkoutSession | null>(null);
  allExercises = signal<Exercise[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  completing = signal(false);

  // Notes editing
  editingNotes = signal(false);
  notesDraft = '';

  // Per-exercise set draft inputs
  drafts = signal<Record<string, SetDraft>>({});

  // Last-session sets keyed by exercise.id
  lastSets = signal<Record<string, HistorySet[]>>({});

  // Exercise picker overlay
  showPicker = signal(false);
  pickerSearch = '';

  filteredExercises = computed(() => {
    const q = this.pickerSearch.toLowerCase();
    const session = this.session();
    const usedIds = new Set(session?.exercises?.map(se => se.exercise.id) ?? []);
    return this.allExercises().filter(
      e => !usedIds.has(e.id) && (e.name.toLowerCase().includes(q) || e.muscleGroup.toLowerCase().includes(q))
    );
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private exerciseService: ExerciseService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.sessionService.get(id).subscribe({
      next: s => {
        this.session.set(s);
        this.loading.set(false);
        this.initDrafts(s.exercises ?? []);
      },
      error: () => { this.error.set('Failed to load session.'); this.loading.set(false); },
    });
    this.exerciseService.list().subscribe({ next: list => this.allExercises.set(list), error: () => {} });
  }

  private initDrafts(exercises: SessionExercise[]): void {
    const d: Record<string, SetDraft> = {};
    for (const se of exercises) {
      d[se.id] = { sessionExerciseId: se.id, reps: null, weightKg: null };
    }
    this.drafts.set(d);
    this.loadLastSets(exercises);
  }

  private loadLastSets(exercises: SessionExercise[]): void {
    for (const se of exercises) {
      const exId = se.exercise.id;
      if (this.lastSets()[exId] !== undefined) continue; // already loaded
      this.exerciseService.getLastSets(exId).subscribe({
        next: sets => this.lastSets.update(m => ({ ...m, [exId]: sets })),
        error: () => {},
      });
    }
  }

  suggestedSet(se: SessionExercise): HistorySet | null {
    const last = this.lastSets()[se.exercise.id];
    if (!last?.length) return null;
    return last[se.sets.length] ?? null;
  }

  copyLast(se: SessionExercise): void {
    const sug = this.suggestedSet(se);
    if (!sug) return;
    this.drafts.update(d => ({ ...d, [se.id]: { sessionExerciseId: se.id, reps: sug.reps, weightKg: sug.weightKg } }));
  }

  logSet(se: SessionExercise): void {
    const draft = this.drafts()[se.id];
    if (!draft || draft.reps === null || draft.weightKg === null) return;
    const sessionId = this.session()!.id;
    this.sessionService.logSet(sessionId, se.id, draft.reps, draft.weightKg).subscribe({
      next: newSet => {
        this.session.update(s => {
          if (!s) return s;
          return {
            ...s,
            exercises: s.exercises?.map(e =>
              e.id === se.id ? { ...e, sets: [...e.sets, newSet] } : e
            ),
          };
        });
        this.drafts.update(d => ({ ...d, [se.id]: { sessionExerciseId: se.id, reps: null, weightKg: null } }));
      },
      error: () => this.error.set('Failed to log set.'),
    });
  }

  removeSet(se: SessionExercise, setId: string): void {
    const sessionId = this.session()!.id;
    this.sessionService.removeSet(sessionId, se.id, setId).subscribe({
      next: () => {
        this.session.update(s => {
          if (!s) return s;
          return {
            ...s,
            exercises: s.exercises?.map(e =>
              e.id === se.id
                ? { ...e, sets: e.sets.filter(st => st.id !== setId).map((st, i) => ({ ...st, setNumber: i + 1 })) }
                : e
            ),
          };
        });
      },
      error: () => this.error.set('Failed to remove set.'),
    });
  }

  openPicker(): void {
    this.pickerSearch = '';
    this.showPicker.set(true);
  }

  addExercise(exerciseId: string): void {
    this.showPicker.set(false);
    const sessionId = this.session()!.id;
    this.sessionService.addExercise(sessionId, exerciseId).subscribe({
      next: se => {
        this.session.update(s => {
          if (!s) return s;
          return { ...s, exercises: [...(s.exercises ?? []), se] };
        });
        this.drafts.update(d => ({ ...d, [se.id]: { sessionExerciseId: se.id, reps: null, weightKg: null } }));
        this.loadLastSets([se]);
      },
      error: () => this.error.set('Failed to add exercise.'),
    });
  }

  removeExercise(se: SessionExercise): void {
    if (!confirm(`Remove "${se.exercise.name}" from this session?`)) return;
    const sessionId = this.session()!.id;
    this.sessionService.removeExercise(sessionId, se.id).subscribe({
      next: () => {
        this.session.update(s => {
          if (!s) return s;
          return { ...s, exercises: s.exercises?.filter(e => e.id !== se.id) };
        });
        this.drafts.update(d => { const nd = { ...d }; delete nd[se.id]; return nd; });
      },
      error: () => this.error.set('Failed to remove exercise.'),
    });
  }

  complete(): void {
    if (!confirm('Mark this workout as complete? You won\'t be able to log more sets.')) return;
    this.completing.set(true);
    this.sessionService.patch(this.session()!.id, { complete: true }).subscribe({
      next: updated => { this.session.set(updated); this.completing.set(false); },
      error: () => { this.error.set('Failed to complete session.'); this.completing.set(false); },
    });
  }

  openNotes(): void {
    this.notesDraft = this.session()?.notes ?? '';
    this.editingNotes.set(true);
  }

  saveNotes(): void {
    this.sessionService.patch(this.session()!.id, { notes: this.notesDraft }).subscribe({
      next: updated => { this.session.set(updated); this.editingNotes.set(false); },
      error: () => this.error.set('Failed to save notes.'),
    });
  }

  formatDuration(startedAt: string, completedAt: string | null): string {
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : Date.now();
    const mins = Math.round((end - start) / 60000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
}
