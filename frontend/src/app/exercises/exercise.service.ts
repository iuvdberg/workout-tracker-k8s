import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type MuscleGroup =
  | 'CHEST' | 'BACK' | 'SHOULDERS' | 'BICEPS' | 'TRICEPS'
  | 'LEGS' | 'GLUTES' | 'CORE' | 'FULL_BODY';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS',
  'LEGS', 'GLUTES', 'CORE', 'FULL_BODY',
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  CHEST: 'Chest',
  BACK: 'Back',
  SHOULDERS: 'Shoulders',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  LEGS: 'Legs',
  GLUTES: 'Glutes',
  CORE: 'Core',
  FULL_BODY: 'Full Body',
};

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  muscleGroup: MuscleGroup;
  imageUrl: string | null;
  isCustom: boolean;
  createdAt: string;
}

export interface ExercisePayload {
  name: string;
  muscleGroup: MuscleGroup;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private readonly url = `${environment.apiUrl}/exercises`;

  constructor(private http: HttpClient) {}

  list(): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(this.url);
  }

  create(payload: ExercisePayload): Observable<Exercise> {
    return this.http.post<Exercise>(this.url, payload);
  }

  update(id: string, payload: Partial<ExercisePayload>): Observable<Exercise> {
    return this.http.patch<Exercise>(`${this.url}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  getHistory(id: string): Observable<ExerciseHistory> {
    return this.http.get<ExerciseHistory>(`${this.url}/${id}/history`);
  }

  getLastSets(exerciseId: string): Observable<HistorySet[]> {
    return this.http.get<ExerciseHistory>(`${this.url}/${exerciseId}/history?limit=1`)
      .pipe(map(h => h.sessions[0]?.sets ?? []));
  }
}

export interface HistorySet {
  setNumber: number;
  reps: number;
  weightKg: number;
}

export interface HistorySession {
  sessionId: string;
  sessionName: string;
  date: string;
  sets: HistorySet[];
  maxWeightKg: number;
  totalVolume: number;
}

export interface ExerciseHistory {
  exercise: { id: string; name: string; muscleGroup: MuscleGroup };
  sessions: HistorySession[];
  personalRecord: { weightKg: number; reps: number; date: string } | null;
}
