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
import type { IntergovernmentalOrganisationListResponse } from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class IntergovernmentalOrganisationService {
  private readonly API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get list of intergovernmental organisations from admin/intergovernmental-organisation API
   */
  findMany(
    page: number = 1,
    limit: number = 100
  ): Observable<IntergovernmentalOrganisationListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http
      .get<ApiResponse<IntergovernmentalOrganisationListResponse>>(
        `${this.API_URL}/admin/intergovernmental-organisation`,
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
