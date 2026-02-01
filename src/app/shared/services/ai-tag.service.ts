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
import type { AiTagListResponse } from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class AiTagService {
  private readonly API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  findMany(page: number = 1, limit: number = 100): Observable<AiTagListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http
      .get<ApiResponse<AiTagListResponse>>(
        `${this.API_URL}/admin/ai-tag`,
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
