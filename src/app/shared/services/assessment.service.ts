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
  Assessment,
  AssessmentPaginatedResponse,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
} from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of assessments
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param search - Search term (optional)
   * @param sortBy - Field name to sort by (optional)
   * @param sortDirection - Sort direction: 'asc' or 'desc' (optional)
   * @param filters - Filter object with column keys and values (optional)
   * @returns Observable with paginated assessment data
   */
  findMany(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc',
    filters?: Record<string, string>
  ): Observable<AssessmentPaginatedResponse> {
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
      .get<ApiResponse<AssessmentPaginatedResponse>>(
        `${this.API_URL}/admin/assessment`,
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
   * Get a single assessment by ID
   * @param id - Assessment ID
   * @returns Observable with assessment data
   */
  findOne(id: string): Observable<Assessment> {
    return this.http
      .get<ApiResponse<{ assessment: Assessment }>>(
        `${this.API_URL}/admin/assessment/${id}`
      )
      .pipe(
        map((res) => {
          if (!res.results || !res.results.assessment) {
            throw new Error('Invalid response from server');
          }
          return res.results.assessment;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Create a new assessment
   * @param assessmentData - Assessment data to create
   * @returns Observable with created assessment data
   */
  create(assessmentData: CreateAssessmentRequest): Observable<Assessment> {
    return this.http
      .post<ApiResponse<Assessment>>(
        `${this.API_URL}/admin/assessment`,
        assessmentData
      )
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return assessmentData as unknown as Assessment;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Create failed'));
          }
          return assessmentData as unknown as Assessment;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Update an existing assessment
   * @param assessmentData - Assessment data to update (must include _id)
   * @returns Observable with updated assessment data
   */
  update(assessmentData: UpdateAssessmentRequest): Observable<Assessment> {
    return this.http
      .put<ApiResponse<Assessment>>(
        `${this.API_URL}/admin/assessment/update`,
        assessmentData
      )
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return assessmentData as unknown as Assessment;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Update failed'));
          }
          return assessmentData as unknown as Assessment;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete one or more assessments
   * @param ids - Single ID string or array of ID strings
   * @returns Observable with deletion result
   */
  delete(ids: string | string[]): Observable<any> {
    const idsParam = Array.isArray(ids) ? ids.join(',') : ids;

    return this.http
      .delete<ApiResponse<any>>(
        `${this.API_URL}/admin/assessment/delete/${idsParam}`
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

