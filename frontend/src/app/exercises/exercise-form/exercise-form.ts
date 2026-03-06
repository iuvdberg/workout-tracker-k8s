import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Exercise, ExercisePayload, MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, MuscleGroup } from '../exercise.service';

@Component({
  selector: 'app-exercise-form',
  imports: [FormsModule],
  templateUrl: './exercise-form.html',
  styleUrl: './exercise-form.scss',
})
export class ExerciseForm implements OnChanges {
  @Input() exercise: Exercise | null = null;
  @Output() saved = new EventEmitter<ExercisePayload>();
  @Output() cancelled = new EventEmitter<void>();

  readonly muscleGroups = MUSCLE_GROUPS;
  readonly muscleGroupLabels = MUSCLE_GROUP_LABELS;

  name = '';
  muscleGroup: MuscleGroup = 'CHEST';
  description = '';

  ngOnChanges(): void {
    if (this.exercise) {
      this.name = this.exercise.name;
      this.muscleGroup = this.exercise.muscleGroup;
      this.description = this.exercise.description ?? '';
    } else {
      this.name = '';
      this.muscleGroup = 'CHEST';
      this.description = '';
    }
  }

  submit(): void {
    if (!this.name.trim()) return;
    this.saved.emit({
      name: this.name.trim(),
      muscleGroup: this.muscleGroup,
      description: this.description.trim() || undefined,
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
