import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'MEMBER';
  createdAt: string;
  _count: { sessions: number };
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly url = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  list(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.url);
  }

  setRole(id: string, role: 'ADMIN' | 'MEMBER'): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.url}/${id}`, { role });
  }
}
