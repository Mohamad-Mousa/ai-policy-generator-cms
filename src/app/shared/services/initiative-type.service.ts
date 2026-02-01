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
import type { InitiativeTypeOptionListResponse } from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class InitiativeTypeService {
  private readonly API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  findMany(page: number = 1, limit: number = 100): Observable<InitiativeTypeOptionListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http
      .get<ApiResponse<InitiativeTypeOptionListResponse>>(
        `${this.API_URL}/admin/initiative-type`,
        { params }
      )
      .pipe(
        map((res) => {
          if (!res.results || !res.results.data) {
            throw new Error('Invalid response from server');
          }
          return res.results;
        }),
        catchError((err: HttpErrorResponse) => throwError(() => err))
      );
  }
}
