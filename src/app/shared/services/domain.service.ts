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
  Domain,
  DomainPaginatedResponse,
  CreateDomainRequest,
  UpdateDomainRequest,
} from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class DomainService {
  API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of domains
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param search - Search term (optional)
   * @param sortBy - Field name to sort by (optional)
   * @param sortDirection - Sort direction: 'asc' or 'desc' (optional)
   * @param filters - Filter object with column keys and values (optional)
   * @returns Observable with paginated domain data
   */
  findMany(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc',
    filters?: Record<string, string>
  ): Observable<DomainPaginatedResponse> {
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
      .get<ApiResponse<DomainPaginatedResponse>>(
        `${this.API_URL}/admin/domain`,
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

  /**
   * Get a single domain by ID
   * @param id - Domain ID
   * @returns Observable with domain data
   */
  findOne(id: string): Observable<Domain> {
    return this.http
      .get<ApiResponse<Domain>>(`${this.API_URL}/admin/domain/${id}`)
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

  /**
   * Create a new domain
   * @param domainData - Domain data to create
   * @returns Observable with created domain data
   */
  create(domainData: CreateDomainRequest): Observable<Domain> {
    return this.http
      .post<ApiResponse<Domain>>(`${this.API_URL}/admin/domain`, domainData)
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return domainData as unknown as Domain;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Create failed'));
          }
          return domainData as unknown as Domain;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Update an existing domain
   * @param domainData - Domain data to update (must include _id)
   * @returns Observable with updated domain data
   */
  update(domainData: UpdateDomainRequest): Observable<Domain> {
    return this.http
      .put<ApiResponse<Domain>>(
        `${this.API_URL}/admin/domain/update`,
        domainData
      )
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return domainData as unknown as Domain;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Update failed'));
          }
          return domainData as unknown as Domain;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete one or more domains
   * @param ids - Single ID string or array of ID strings
   * @returns Observable with deletion result
   */
  delete(ids: string | string[]): Observable<any> {
    const idsParam = Array.isArray(ids) ? ids.join(',') : ids;

    return this.http
      .delete<ApiResponse<any>>(
        `${this.API_URL}/admin/domain/delete/${idsParam}`
      )
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return {
              success: true,
              message: String(res.message || 'Successfully deleted'),
              deletedIds: idsParam,
            };
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Delete failed'));
          }
          return {
            success: true,
            message: String(res.message || 'Successfully deleted'),
            deletedIds: idsParam,
          };
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }
}
