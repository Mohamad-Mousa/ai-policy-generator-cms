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
import type { Initiative, InitiativePaginatedResponse } from '@shared/interfaces';

export interface InitiativeFindManyParams {
  page?: number;
  limit?: number;
  term?: string;
  status?: string;
  category?: string;
  gaiinCountryId?: string;
  startYear?: number | string;
  intergovernmentalOrganisationId?: number | string;
  initiativeTypeId?: number | string;
  aiPrincipleId?: number | string;
  aiTagId?: number | string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class InitiativeService {
  private readonly API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of initiatives from admin/initiative API
   */
  findMany(params: InitiativeFindManyParams = {}): Observable<InitiativePaginatedResponse> {
    const {
      page = 1,
      limit = 20,
      term = '',
      status = '',
      category = '',
      gaiinCountryId = '',
      startYear,
      intergovernmentalOrganisationId,
      initiativeTypeId,
      aiPrincipleId,
      aiTagId,
      sortBy = 'createdAt',
      sortDirection = 'desc',
    } = params;

    let httpParams = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('sortBy', sortBy)
      .set('sortDirection', sortDirection);

    if (term && term.trim()) {
      httpParams = httpParams.set('term', term.trim());
    }
    if (status && status.trim()) {
      httpParams = httpParams.set('status', status.trim());
    }
    if (category && category.trim()) {
      httpParams = httpParams.set('category', category.trim());
    }
    if (gaiinCountryId && gaiinCountryId.trim()) {
      httpParams = httpParams.set('gaiinCountryId', gaiinCountryId.trim());
    }
    if (startYear != null && startYear !== '') {
      const year = typeof startYear === 'string' ? startYear.trim() : String(startYear);
      if (year) {
        httpParams = httpParams.set('startYear', year);
      }
    }
    if (intergovernmentalOrganisationId != null && intergovernmentalOrganisationId !== '') {
      const id = typeof intergovernmentalOrganisationId === 'string'
        ? intergovernmentalOrganisationId.trim()
        : String(intergovernmentalOrganisationId);
      if (id) {
        httpParams = httpParams.set('intergovernmentalOrganisationId', id);
      }
    }
    if (initiativeTypeId != null && initiativeTypeId !== '') {
      const id = typeof initiativeTypeId === 'string' ? initiativeTypeId.trim() : String(initiativeTypeId);
      if (id) httpParams = httpParams.set('initiativeTypeId', id);
    }
    if (aiPrincipleId != null && aiPrincipleId !== '') {
      const id = typeof aiPrincipleId === 'string' ? aiPrincipleId.trim() : String(aiPrincipleId);
      if (id) httpParams = httpParams.set('aiPrincipleId', id);
    }
    if (aiTagId != null && aiTagId !== '') {
      const id = typeof aiTagId === 'string' ? aiTagId.trim() : String(aiTagId);
      if (id) httpParams = httpParams.set('aiTagId', id);
    }

    return this.http
      .get<ApiResponse<InitiativePaginatedResponse>>(
        `${this.API_URL}/admin/initiative`,
        { params: httpParams }
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
   * Get a single initiative by ID from admin/initiative/:id
   */
  findOne(id: string): Observable<Initiative> {
    return this.http
      .get<ApiResponse<Initiative>>(`${this.API_URL}/admin/initiative/${id}`)
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
}
