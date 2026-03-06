import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth';

@Component({
  selector: 'app-callback',
  imports: [],
  template: `<p>Signing you in...</p>`,
})
export class Callback implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.auth.handleCallback(token);
    }
  }
}
