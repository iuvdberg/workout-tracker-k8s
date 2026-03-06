import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StatsSummary {
  totalSessions: number;
  totalSets: number;
  totalVolumeKg: number;
}

export interface WeeklyActivity {
  week: string; // YYYY-MM-DD (Monday)
  count: number;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  reps: number;
  date: string;
}

export interface TopExercise {
  exerciseId: string;
  exerciseName: string;
  totalSets: number;
  totalVolumeKg: number;
}

export interface MuscleGroupStat {
  group: string;
  sets: number;
}

export interface Stats {
  summary: StatsSummary;
  weeklyActivity: WeeklyActivity[];
  personalRecords: PersonalRecord[];
  topExercises: TopExercise[];
  muscleGroups: MuscleGroupStat[];
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly url = `${environment.apiUrl}/stats`;

  constructor(private http: HttpClient) {}

  get(): Observable<Stats> {
    return this.http.get<Stats>(this.url);
  }
}
