import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth';
import { TemplateService, Template } from '../template.service';

@Component({
  selector: 'app-template-list',
  imports: [RouterLink],
  templateUrl: './template-list.html',
  styleUrl: './template-list.scss',
})
export class TemplateList implements OnInit {
  templates = signal<Template[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(public auth: AuthService, private templateService: TemplateService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.templateService.list().subscribe({
      next: list => { this.templates.set(list); this.loading.set(false); },
      error: () => { this.error.set('Failed to load templates.'); this.loading.set(false); },
    });
  }

  delete(template: Template): void {
    if (!confirm(`Delete "${template.name}"?`)) return;
    this.templateService.delete(template.id).subscribe({
      next: () => this.templates.update(list => list.filter(t => t.id !== template.id)),
      error: () => this.error.set('Failed to delete template.'),
    });
  }
}
