import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../session.service';
import { TemplateService, Template } from '../../templates/template.service';

@Component({
  selector: 'app-session-start',
  imports: [FormsModule, RouterLink],
  templateUrl: './session-start.html',
  styleUrl: './session-start.scss',
})
export class SessionStart implements OnInit {
  name = '';
  selectedTemplateId = '';
  templates = signal<Template[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private sessionService: SessionService,
    private templateService: TemplateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.templateService.list().subscribe({
      next: list => this.templates.set(list),
      error: () => {},
    });
  }

  start(): void {
    if (!this.name.trim()) return;
    this.loading.set(true);
    this.error.set(null);
    const templateId = this.selectedTemplateId || undefined;
    this.sessionService.start(this.name.trim(), templateId).subscribe({
      next: session => this.router.navigate(['/sessions', session.id]),
      error: () => { this.error.set('Failed to start session.'); this.loading.set(false); },
    });
  }
}
