import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SessionSet {
  id: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  createdAt: string;
}

export interface SessionExercise {
  id: string;
  order: number;
  exercise: { id: string; name: string; muscleGroup: string };
  sets: SessionSet[];
}

export interface WorkoutSession {
  id: string;
  name: string;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
  templateId: string | null;
  userId: string;
  exercises?: SessionExercise[];
  _count?: { exercises: number };
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly url = `${environment.apiUrl}/sessions`;

  constructor(private http: HttpClient) {}

  list(): Observable<WorkoutSession[]> {
    return this.http.get<WorkoutSession[]>(this.url);
  }

  get(id: string): Observable<WorkoutSession> {
    return this.http.get<WorkoutSession>(`${this.url}/${id}`);
  }

  start(name: string, templateId?: string): Observable<WorkoutSession> {
    return this.http.post<WorkoutSession>(this.url, { name, templateId });
  }

  patch(id: string, data: { name?: string; notes?: string; complete?: boolean }): Observable<WorkoutSession> {
    return this.http.patch<WorkoutSession>(`${this.url}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  addExercise(sessionId: string, exerciseId: string): Observable<SessionExercise> {
    return this.http.post<SessionExercise>(`${this.url}/${sessionId}/exercises`, { exerciseId });
  }

  removeExercise(sessionId: string, sessionExerciseId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${sessionId}/exercises/${sessionExerciseId}`);
  }

  logSet(sessionId: string, sessionExerciseId: string, reps: number, weightKg: number): Observable<SessionSet> {
    return this.http.post<SessionSet>(
      `${this.url}/${sessionId}/exercises/${sessionExerciseId}/sets`,
      { reps, weightKg }
    );
  }

  removeSet(sessionId: string, sessionExerciseId: string, setId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${sessionId}/exercises/${sessionExerciseId}/sets/${setId}`);
  }
}
