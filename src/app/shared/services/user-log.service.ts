import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '@shared/interfaces';

export interface UserLog {
  _id: string;
  user: string;
  action: 'get' | 'post' | 'put' | 'delete';
  description: string;
  table: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface UserLogPaginatedResponse {
  data: UserLog[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class UserLogService {
  API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of user logs
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param search - Search term (optional)
   * @param sortBy - Field name to sort by (optional)
   * @param sortDirection - Sort direction: 'asc' or 'desc' (optional)
   * @param filters - Filter object with column keys and values (optional)
   * @returns Observable with paginated user log data
   */
  findMany(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc',
    filters?: Record<string, string>
  ): Observable<UserLogPaginatedResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search && search.trim()) {
      params = params.set('term', search.trim());
    }

    if (sortBy) {
      params = params.set('sortBy', sortBy);
    }

    if (sortDirection) {
      params = params.set('sortDirection', sortDirection);
    }

    if (filters) {
      Object.keys(filters).forEach((key) => {
        const value = filters[key];
        if (value && value.trim()) {
          params = params.set(key, value.trim());
        }
      });
    }

    return this.http
      .get<ApiResponse<UserLogPaginatedResponse>>(
        `${this.API_URL}/admin/user-log`,
        { params }
      )
      .pipe(
        map((res) => {
          if (!res.results || !res.results.data) {
            throw new Error('Invalid response from server');
          }
          return res.results;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }
}
