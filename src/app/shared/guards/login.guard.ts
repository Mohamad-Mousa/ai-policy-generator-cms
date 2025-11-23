import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@shared/services';

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
