import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map, tap, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '@shared/interfaces';
import { Admin, Privilege, User, UserAuthenticated } from '@shared/interfaces';
import { PrivilegeAccess } from '@shared/enums';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser: any | undefined;
  private user_privileges: { adminPrivileges: Privilege[] } | undefined;

  API_URL = environment.ApiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loadPrivilegesFromStorage();
    this.loadCurrentUserFromStorage();
  }

  login(admin: any): Observable<UserAuthenticated> {
    return this.http
      .post<ApiResponse<UserAuthenticated>>(
        `${this.API_URL}/admin/auth/authenticate`,
        admin,
        { withCredentials: true }
      )
      .pipe(
        map((res) => {
          let results = res.results;

          if (!results?.accessToken) {
            throw new Error('Invalid response from server');
          }
          this.setCurrentUser(results.admin);
          if (results.privileges) {
            this.setPrivileges({ adminPrivileges: results.privileges });
          }
          this.setAccessToken(results.accessToken);
          if (results.refreshToken) {
            this.setRefreshToken(results.refreshToken);
          }
          return results;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  logout() {
    return this.http
      .post<ApiResponse<null>>(`${this.API_URL}/admin/auth/logout`, null)
      .pipe(
        tap(() => {
          this.clearTokens();
        })
      );
  }

  setAccessToken(token: string) {
    localStorage.setItem('access_token', token);
  }

  getAccessToken() {
    return localStorage.getItem('access_token') || false;
  }

  setRefreshToken(token: string) {
    localStorage.setItem('refresh_token', token);
  }

  getRefreshToken() {
    return localStorage.getItem('refresh_token') || false;
  }

  setPrivileges(privileges: { adminPrivileges: Privilege[] }) {
    this.user_privileges = privileges;
    localStorage.setItem('user_privileges', JSON.stringify(privileges));
  }

  loadPrivilegesFromStorage() {
    const stored = localStorage.getItem('user_privileges');
    if (stored) {
      try {
        this.user_privileges = JSON.parse(stored);
      } catch (error) {
        console.error('Error loading privileges from storage:', error);
        localStorage.removeItem('user_privileges');
      }
    }
  }

  setCurrentUser(user: any) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('current_user');
    }
  }

  loadCurrentUserFromStorage() {
    const stored = localStorage.getItem('current_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch (error) {
        console.error('Error loading current user from storage:', error);
        localStorage.removeItem('current_user');
      }
    }
  }

  getCurrentUser(): Admin | undefined {
    return this.currentUser;
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_privileges');
    localStorage.removeItem('current_user');
    this.currentUser = undefined;
    this.user_privileges = undefined;
  }

  refreshToken() {
    return this.http
      .post<ApiResponse<UserAuthenticated>>(
        `${this.API_URL}/auth-admin/refresh-token`,
        null,
        { withCredentials: true }
      )
      .pipe(
        tap((res) => {
          let results = res.results;
          this.setCurrentUser(results.admin);
          this.setAccessToken(results.accessToken);
          if (results.refreshToken) {
            this.setRefreshToken(results.refreshToken);
          }
          if (results.privileges) {
            this.setPrivileges({ adminPrivileges: results.privileges });
          }
        })
      );
  }

  getPrivileges() {
    return this.http
      .get<ApiResponse<{ adminPrivileges: Privilege[] }>>(
        `${this.API_URL}/privilege`
      )
      .pipe(
        tap((response: ApiResponse<{ adminPrivileges: Privilege[] }>) =>
          this.setPrivileges(response.results)
        ),
        map(
          (response: ApiResponse<{ adminPrivileges: Privilege[] }>) =>
            response.results.adminPrivileges
        )
      );
  }

  hasPrivilege(function_key: string, access: PrivilegeAccess) {
    if (!this.user_privileges?.adminPrivileges) return false;
    const privilege = this.user_privileges.adminPrivileges.find(
      (privilege: Privilege) => privilege.function.key === function_key
    );
    if (!privilege) return false;

    switch (access) {
      case PrivilegeAccess.R:
        return privilege.read;
      case PrivilegeAccess.W:
        return privilege.write;
      case PrivilegeAccess.U:
        return privilege.update;
      case PrivilegeAccess.D:
        return privilege.delete;
      default:
        return false;
    }
  }

  getFirstAccessibleRoute(): string {
    // Prioritize AI Readiness Assessment as default (no privilege required)
    // This is the main feature of the application
    return 'ai-readiness-assessment';

    // Fallback to other routes if needed (currently disabled)
    // const routes = [
    //   { path: 'overview', functionKey: 'dashboard' },
    //   { path: 'admins', functionKey: 'admins' },
    //   { path: 'admin-types', functionKey: 'adminTypes' },
    //   { path: 'settings', functionKey: 'settings' },
    // ];

    // for (const route of routes) {
    //   if (this.hasPrivilege(route.functionKey, PrivilegeAccess.R)) {
    //     return route.path;
    //   }
    // }

    // return 'profile';
  }

  get isLoggedIn(): boolean {
    const token = localStorage.getItem('access_token');

    if (!token) {
      return false;
    }

    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenData.exp * 1000;

      if (Date.now() >= expirationTime) {
        this.clearTokens();
        return false;
      }

      return true;
    } catch (error) {
      this.clearTokens();
      return false;
    }
  }
}
