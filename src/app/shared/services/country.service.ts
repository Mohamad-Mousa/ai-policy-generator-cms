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
import { CountryListResponse } from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class CountryService {
  private readonly API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of countries from admin/country API
   * @param page - Page number (default 1)
   * @param limit - Items per page (default 50)
   * @param search - Search term (optional)
   * @returns Observable with country list (data and totalCount)
   */
  findMany(
    page: number = 1,
    limit: number = 50,
    search?: string
  ): Observable<CountryListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search && search.trim()) {
      params = params.set('term', search.trim());
    }

    return this.http
      .get<ApiResponse<CountryListResponse>>(`${this.API_URL}/admin/country`, {
        params,
      })
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
