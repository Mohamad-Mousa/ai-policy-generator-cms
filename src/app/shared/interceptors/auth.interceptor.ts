import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
} from '@angular/common/http';
import { AuthService } from '@shared/services';
import { Credentials } from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<Credentials>, next: HttpHandler) {
    const accessToken = this.authService.getAccessToken();

    if (
      accessToken &&
      typeof accessToken === 'string' &&
      accessToken !== 'false'
    ) {
      const authRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return next.handle(authRequest);
    }

    return next.handle(request);
  }
}
