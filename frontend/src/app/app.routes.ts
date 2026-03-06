import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './auth/auth-guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.Login) },
  { path: 'auth/callback', loadComponent: () => import('./auth/callback/callback').then(m => m.Callback) },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then(m => m.Shell),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'exercises', loadComponent: () => import('./exercises/exercise-list/exercise-list').then(m => m.ExerciseList) },
      { path: 'exercises/:id', loadComponent: () => import('./exercises/exercise-history/exercise-history').then(m => m.ExerciseHistory) },
      { path: 'templates', loadComponent: () => import('./templates/template-list/template-list').then(m => m.TemplateList) },
      { path: 'templates/new', loadComponent: () => import('./templates/template-form/template-form').then(m => m.TemplateForm) },
      { path: 'templates/:id/edit', loadComponent: () => import('./templates/template-form/template-form').then(m => m.TemplateForm) },
      { path: 'sessions', loadComponent: () => import('./sessions/session-list/session-list').then(m => m.SessionList) },
      { path: 'sessions/new', loadComponent: () => import('./sessions/session-start/session-start').then(m => m.SessionStart) },
      { path: 'sessions/:id', loadComponent: () => import('./sessions/session-detail/session-detail').then(m => m.SessionDetail) },
      { path: 'progress', loadComponent: () => import('./progress/progress').then(m => m.Progress) },
      { path: 'admin/users', canActivate: [adminGuard], loadComponent: () => import('./admin/users/users').then(m => m.AdminUsers) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
