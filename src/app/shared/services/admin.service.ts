import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, Admin, AdminPaginatedResponse } from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class AdminService {
  API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of admins
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param search - Search term (optional)
   * @param sortBy - Field name to sort by (optional)
   * @param sortDirection - Sort direction: 'asc' or 'desc' (optional)
   * @param filters - Filter object with column keys and values (optional)
   * @returns Observable with paginated admin data
   */
  findMany(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc',
    filters?: Record<string, string>
  ): Observable<AdminPaginatedResponse> {
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
      .get<ApiResponse<AdminPaginatedResponse>>(
        `${this.API_URL}/admin/admins`,
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
   * Get a single admin by ID
   * @param id - Admin ID
   * @returns Observable with admin data
   */
  findOne(id: string): Observable<Admin> {
    return this.http
      .get<ApiResponse<Admin>>(`${this.API_URL}/admins/${id}`)
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
   * Create a new admin
   * @param adminData - Admin data to create
   * @param imageFile - Optional image file to upload
   * @returns Observable with created admin data
   */
  create(adminData: Partial<Admin>, imageFile?: File): Observable<Admin> {
    const formData = new FormData();

    Object.keys(adminData).forEach((key) => {
      const value = adminData[key];
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && !(value instanceof File)) {
          if (value._id) {
            formData.append(key, value._id);
          } else {
            formData.append(key, JSON.stringify(value));
          }
        } else {
          formData.append(key, value as string | Blob);
        }
      }
    });

    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.http
      .post<ApiResponse<Admin>>(`${this.API_URL}/admin/admins`, formData)
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
   * Update an existing admin
   * @param adminData - Admin data to update (must include _id)
   * @param imageFile - Optional image file to upload
   * @returns Observable with updated admin data
   */
  update(adminData: Partial<Admin>, imageFile?: File): Observable<Admin> {
    const formData = new FormData();

    Object.keys(adminData).forEach((key) => {
      const value = adminData[key];
      if (value !== null && value !== undefined) {
        if (typeof value === 'object' && !(value instanceof File)) {
          if (value._id) {
            formData.append(key, value._id);
          } else {
            formData.append(key, JSON.stringify(value));
          }
        } else {
          formData.append(key, value as string | Blob);
        }
      }
    });

    if (imageFile) {
      formData.append('image', imageFile);
    }

    return this.http
      .put<ApiResponse<Admin>>(`${this.API_URL}/admin/admins/update`, formData)
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return adminData as Admin;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Update failed'));
          }
          return adminData as Admin;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete one or more admins
   * @param ids - Single ID string or array of ID strings
   * @returns Observable with deletion result
   */
  delete(ids: string | string[]): Observable<any> {
    const idsParam = Array.isArray(ids) ? ids.join(',') : ids;

    return this.http
      .delete<ApiResponse<any>>(
        `${this.API_URL}/admin/admins/delete/${idsParam}`
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
