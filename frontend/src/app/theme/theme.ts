import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'theme';

  readonly darkMode = signal<boolean>(this.loadPreference());

  constructor() {
    // Apply immediately on init to avoid flash of wrong theme
    document.documentElement.setAttribute('data-theme', this.darkMode() ? 'dark' : 'light');

    effect(() => {
      const dark = this.darkMode();
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      localStorage.setItem(this.STORAGE_KEY, dark ? 'dark' : 'light');
    });
  }

  toggle(): void {
    this.darkMode.update(v => !v);
  }

  private loadPreference(): boolean {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
