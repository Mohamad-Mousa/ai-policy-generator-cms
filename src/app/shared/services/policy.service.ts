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

export interface Policy {
  _id: string;
  domains: Array<{
    _id: string;
    title: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
    subDomains?: Array<unknown>;
  }>;
  assessments:
    | Array<{
        _id: string;
        title: string;
        description?: string;
        fullName?: string;
        status?: string;
        domain?: string;
        questions?: Array<{
          _id?: string;
          question: string;
          answer?: string;
        }>;
      }>
    | {
        data: Array<{
          _id: string;
          title: string;
          description?: string;
          fullName?: string;
          status?: string;
          domain?: string;
          questions?: Array<{
            _id?: string;
            question: string;
            answer?: string;
          }>;
        }>;
        totalCount: number;
        page: number;
        limit: number;
      };
  sector: string;
  organizationSize: string;
  riskAppetite: string;
  implementationTimeline: string;
  createdAt: string;
  updatedAt?: string;
  __v?: number;
}

export interface PolicyPaginatedResponse {
  data: Policy[];
  totalCount: number;
}

export interface CreatePolicyRequest {
  domains: string[];
  assessments: string[];
  sector: string;
  organizationSize: string;
  riskAppetite: string;
  implementationTimeline: string;
}

@Injectable({ providedIn: 'root' })
export class PolicyService {
  API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of policies
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param search - Search term (optional)
   * @param sortBy - Field name to sort by (optional)
   * @param sortDirection - Sort direction: 'asc' or 'desc' (optional)
   * @param filters - Filter object with column keys and values (optional)
   * @returns Observable with paginated policy data
   */
  findMany(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc',
    filters?: Record<string, string>
  ): Observable<PolicyPaginatedResponse> {
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
      .get<ApiResponse<PolicyPaginatedResponse>>(
        `${this.API_URL}/admin/policy`,
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
   * Get a single policy by ID
   * @param id - Policy ID
   * @param assessmentPage - Page number for assessments (default: 1)
   * @param assessmentLimit - Items per page for assessments (default: 10)
   * @returns Observable with policy data
   */
  findOne(
    id: string,
    assessmentPage: number = 1,
    assessmentLimit: number = 10
  ): Observable<Policy> {
    let params = new HttpParams();
    if (assessmentPage) {
      params = params.set('assessmentPage', assessmentPage.toString());
    }
    if (assessmentLimit) {
      params = params.set('assessmentLimit', assessmentLimit.toString());
    }

    return this.http
      .get<ApiResponse<{ policy: Policy }>>(
        `${this.API_URL}/admin/policy/${id}`,
        { params }
      )
      .pipe(
        map((res) => {
          if (!res.results || !res.results.policy) {
            throw new Error('Invalid response from server');
          }
          return res.results.policy;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Create a new policy
   * @param policyData - Policy data to create
   * @returns Observable with created policy data
   */
  create(policyData: CreatePolicyRequest): Observable<Policy> {
    return this.http
      .post<ApiResponse<Policy>>(`${this.API_URL}/admin/policy`, policyData)
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return policyData as unknown as Policy;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Create failed'));
          }
          return policyData as unknown as Policy;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete one or more policies
   * @param ids - Single ID string or array of ID strings
   * @returns Observable with deletion result
   */
  delete(ids: string | string[]): Observable<any> {
    const idsParam = Array.isArray(ids) ? ids.join(',') : ids;

    return this.http
      .delete<ApiResponse<any>>(
        `${this.API_URL}/admin/policy/delete/${idsParam}`
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
