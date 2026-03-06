import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TemplateService, TemplatePayload } from '../template.service';
import { ExerciseService, Exercise, MUSCLE_GROUP_LABELS, MuscleGroup } from '../../exercises/exercise.service';

interface ExerciseRow {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultWeight: number | null;
}

@Component({
  selector: 'app-template-form',
  imports: [FormsModule, RouterLink],
  templateUrl: './template-form.html',
  styleUrl: './template-form.scss',
})
export class TemplateForm implements OnInit {
  readonly muscleGroupLabels = MUSCLE_GROUP_LABELS;

  name = '';
  description = '';
  rows = signal<ExerciseRow[]>([]);
  selectedExerciseId = '';

  availableExercises = signal<Exercise[]>([]);
  editId: string | null = null;
  saving = signal(false);
  error = signal<string | null>(null);

  isEdit = computed(() => !!this.editId);

  usedIds = computed(() => new Set(this.rows().map(r => r.exerciseId)));

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private templateService: TemplateService,
    private exerciseService: ExerciseService,
  ) {}

  ngOnInit(): void {
    this.exerciseService.list().subscribe(list => this.availableExercises.set(list));

    this.editId = this.route.snapshot.paramMap.get('id');
    if (this.editId) {
      this.templateService.get(this.editId).subscribe({
        next: t => {
          this.name = t.name;
          this.description = t.description ?? '';
          this.rows.set((t.exercises ?? []).map(te => ({
            exerciseId: te.exercise.id,
            exerciseName: te.exercise.name,
            muscleGroup: te.exercise.muscleGroup,
            defaultSets: te.defaultSets,
            defaultReps: te.defaultReps,
            defaultWeight: te.defaultWeight,
          })));
        },
        error: () => this.error.set('Failed to load template.'),
      });
    }
  }

  addExercise(): void {
    const exercise = this.availableExercises().find(e => e.id === this.selectedExerciseId);
    if (!exercise || this.usedIds().has(exercise.id)) return;
    this.rows.update(rows => [...rows, {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      defaultSets: 3,
      defaultReps: 10,
      defaultWeight: null,
    }]);
    this.selectedExerciseId = '';
  }

  removeRow(index: number): void {
    this.rows.update(rows => rows.filter((_, i) => i !== index));
  }

  moveUp(index: number): void {
    if (index === 0) return;
    this.rows.update(rows => {
      const next = [...rows];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  moveDown(index: number): void {
    this.rows.update(rows => {
      if (index === rows.length - 1) return rows;
      const next = [...rows];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  save(): void {
    if (!this.name.trim()) return;
    const payload: TemplatePayload = {
      name: this.name.trim(),
      description: this.description.trim() || undefined,
      exercises: this.rows().map((row, i) => ({
        exerciseId: row.exerciseId,
        order: i + 1,
        defaultSets: row.defaultSets ?? undefined,
        defaultReps: row.defaultReps ?? undefined,
        defaultWeight: row.defaultWeight ?? undefined,
      })),
    };
    this.saving.set(true);
    this.error.set(null);
    const req = this.editId
      ? this.templateService.update(this.editId, payload)
      : this.templateService.create(payload);
    req.subscribe({
      next: () => this.router.navigate(['/templates']),
      error: () => { this.error.set('Failed to save template.'); this.saving.set(false); },
    });
  }
}
