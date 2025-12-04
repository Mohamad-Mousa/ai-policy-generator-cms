import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  AdminType,
  AdminTypePaginatedResponse,
  CreateAdminTypeRequest,
  UpdateAdminTypeRequest,
} from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class AdminTypeService {
  API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of admin types
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param search - Search term (optional)
   * @param sortBy - Field name to sort by (optional)
   * @param sortDirection - Sort direction: 'asc' or 'desc' (optional)
   * @param filters - Filter object with column keys and values (optional)
   * @returns Observable with paginated admin type data
   */
  findMany(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc',
    filters?: Record<string, string>
  ): Observable<AdminTypePaginatedResponse> {
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
      .get<ApiResponse<AdminTypePaginatedResponse>>(
        `${this.API_URL}/admin/admin-type`,
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
   * Get a single admin type by ID
   * @param id - Admin type ID
   * @returns Observable with admin type data
   */
  findOne(id: string): Observable<AdminType> {
    return this.http
      .get<ApiResponse<AdminType>>(`${this.API_URL}/admin/admin-type/${id}`)
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
   * Create a new admin type
   * @param adminTypeData - Admin type data to create
   * @returns Observable with created admin type data
   */
  create(adminTypeData: CreateAdminTypeRequest): Observable<AdminType> {
    return this.http
      .post<ApiResponse<AdminType>>(
        `${this.API_URL}/admin/admin-type`,
        adminTypeData
      )
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return adminTypeData as unknown as AdminType;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Create failed'));
          }
          return adminTypeData as unknown as AdminType;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Update an existing admin type
   * @param adminTypeData - Admin type data to update (must include _id)
   * @returns Observable with updated admin type data
   */
  update(adminTypeData: UpdateAdminTypeRequest): Observable<AdminType> {
    return this.http
      .put<ApiResponse<AdminType>>(
        `${this.API_URL}/admin/admin-type/update`,
        adminTypeData
      )
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return adminTypeData as unknown as AdminType;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Update failed'));
          }
          return adminTypeData as unknown as AdminType;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete one or more admin types
   * @param ids - Single ID string or array of ID strings
   * @returns Observable with deletion result
   */
  delete(ids: string | string[]): Observable<any> {
    const idsParam = Array.isArray(ids) ? ids.join(',') : ids;

    return this.http
      .delete<ApiResponse<any>>(
        `${this.API_URL}/admin/admin-type/delete/${idsParam}`
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
