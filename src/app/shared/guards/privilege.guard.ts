import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '@shared/services';
import { PrivilegeAccess } from '@shared/enums';

export const privilegeGuard = (
  functionKey: string,
  access: PrivilegeAccess
): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn) {
      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
      });
      return false;
    }

    if (authService.hasPrivilege(functionKey, access)) {
      return true;
    }

    const firstAccessibleRoute = authService.getFirstAccessibleRoute();
    router.navigate(['/dashboard', firstAccessibleRoute]);
    return false;
  };
};
