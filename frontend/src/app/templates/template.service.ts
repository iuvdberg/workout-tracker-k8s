import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MuscleGroup } from '../exercises/exercise.service';

export interface TemplateExercise {
  id: string;
  order: number;
  defaultSets: number | null;
  defaultReps: number | null;
  defaultWeight: number | null;
  exercise: { id: string; name: string; muscleGroup: MuscleGroup; };
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  _count?: { exercises: number };
  exercises?: TemplateExercise[];
}

export interface TemplatePayload {
  name: string;
  description?: string;
  exercises: {
    exerciseId: string;
    order: number;
    defaultSets?: number;
    defaultReps?: number;
    defaultWeight?: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class TemplateService {
  private readonly url = `${environment.apiUrl}/templates`;

  constructor(private http: HttpClient) {}

  list(): Observable<Template[]> {
    return this.http.get<Template[]>(this.url);
  }

  get(id: string): Observable<Template> {
    return this.http.get<Template>(`${this.url}/${id}`);
  }

  create(payload: TemplatePayload): Observable<Template> {
    return this.http.post<Template>(this.url, payload);
  }

  update(id: string, payload: TemplatePayload): Observable<Template> {
    return this.http.put<Template>(`${this.url}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
