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
import {
  Subdomain,
  SubdomainPaginatedResponse,
  CreateSubdomainRequest,
  UpdateSubdomainRequest,
} from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class SubdomainService {
  API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  findMany(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc',
    filters?: Record<string, string>
  ): Observable<SubdomainPaginatedResponse> {
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
        if (value && String(value).trim()) {
          params = params.set(key, String(value).trim());
        }
      });
    }

    return this.http
      .get<ApiResponse<SubdomainPaginatedResponse>>(
        `${this.API_URL}/admin/subdomain`,
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

  findOne(id: string): Observable<Subdomain> {
    return this.http
      .get<ApiResponse<Subdomain>>(`${this.API_URL}/admin/subdomain/${id}`)
      .pipe(
        map((res) => {
          if (!res.results) {
            throw new Error('Invalid response from server');
          }
          return res.results;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  create(body: CreateSubdomainRequest): Observable<Subdomain> {
    return this.http
      .post<ApiResponse<Subdomain>>(`${this.API_URL}/admin/subdomain`, body)
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return body as unknown as Subdomain;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Create failed'));
          }
          return body as unknown as Subdomain;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  update(body: UpdateSubdomainRequest): Observable<Subdomain> {
    return this.http
      .put<ApiResponse<Subdomain>>(
        `${this.API_URL}/admin/subdomain/update`,
        body
      )
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return body as unknown as Subdomain;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Update failed'));
          }
          return body as unknown as Subdomain;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  delete(ids: string | string[]): Observable<unknown> {
    const idsParam = Array.isArray(ids) ? ids.join(',') : ids;

    return this.http
      .delete<ApiResponse<unknown>>(
        `${this.API_URL}/admin/subdomain/delete/${idsParam}`
      )
      .pipe(
        map((res) => {
          if (res.error === true) {
            throw new Error(String(res.message || 'Delete failed'));
          }
          return res.results ?? { success: true };
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }
}
