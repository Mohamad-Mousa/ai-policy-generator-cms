import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@shared/services';

@Component({
  selector: 'app-dashboard-redirect',
  standalone: true,
  template: '',
})
export class DashboardRedirectComponent implements OnInit {
  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    const firstAccessibleRoute = this.authService.getFirstAccessibleRoute();
    this.router.navigate(['/dashboard', firstAccessibleRoute], {
      replaceUrl: true,
    });
  }
}
