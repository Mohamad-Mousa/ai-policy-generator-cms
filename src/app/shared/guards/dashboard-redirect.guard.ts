import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@shared/services';

export const dashboardRedirectGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn) {
    router.navigate(['/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  const firstAccessibleRoute = authService.getFirstAccessibleRoute();
  router.navigate(['/dashboard', firstAccessibleRoute], { replaceUrl: true });
  return false;
};

