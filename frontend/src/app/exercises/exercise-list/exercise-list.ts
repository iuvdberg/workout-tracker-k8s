import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth';
import { ExerciseService, Exercise, ExercisePayload, MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, MuscleGroup } from '../exercise.service';
import { ExerciseForm } from '../exercise-form/exercise-form';

@Component({
  selector: 'app-exercise-list',
  imports: [ExerciseForm, RouterLink],
  templateUrl: './exercise-list.html',
  styleUrl: './exercise-list.scss',
})
export class ExerciseList implements OnInit {
  readonly muscleGroups = MUSCLE_GROUPS;
  readonly muscleGroupLabels = MUSCLE_GROUP_LABELS;

  exercises = signal<Exercise[]>([]);
  filterGroup = signal<MuscleGroup | null>(null);
  editingExercise = signal<Exercise | null>(null);
  showForm = signal(false);
  loading = signal(true);
  error = signal<string | null>(null);

  filtered = computed(() => {
    const group = this.filterGroup();
    return group
      ? this.exercises().filter(e => e.muscleGroup === group)
      : this.exercises();
  });

  constructor(public auth: AuthService, private exerciseService: ExerciseService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.exerciseService.list().subscribe({
      next: list => { this.exercises.set(list); this.loading.set(false); },
      error: () => { this.error.set('Failed to load exercises.'); this.loading.set(false); },
    });
  }

  openCreate(): void {
    this.editingExercise.set(null);
    this.showForm.set(true);
  }

  openEdit(exercise: Exercise): void {
    this.editingExercise.set(exercise);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingExercise.set(null);
  }

  onSaved(payload: ExercisePayload): void {
    const editing = this.editingExercise();
    if (editing) {
      this.exerciseService.update(editing.id, payload).subscribe({
        next: updated => {
          this.exercises.update(list => list.map(e => e.id === updated.id ? updated : e));
          this.closeForm();
        },
        error: () => this.error.set('Failed to update exercise.'),
      });
    } else {
      this.exerciseService.create(payload).subscribe({
        next: created => {
          this.exercises.update(list => [...list, created].sort((a, b) =>
            a.muscleGroup.localeCompare(b.muscleGroup) || a.name.localeCompare(b.name)
          ));
          this.closeForm();
        },
        error: () => this.error.set('Failed to create exercise.'),
      });
    }
  }

  deleteExercise(exercise: Exercise): void {
    if (!confirm(`Delete "${exercise.name}"?`)) return;
    this.exerciseService.delete(exercise.id).subscribe({
      next: () => this.exercises.update(list => list.filter(e => e.id !== exercise.id)),
      error: () => this.error.set('Failed to delete exercise.'),
    });
  }

  setFilter(group: MuscleGroup | null): void {
    this.filterGroup.set(group);
  }
}
