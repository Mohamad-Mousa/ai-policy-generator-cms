import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '@shared/interfaces';
import { Question } from '@shared/interfaces';

/** Domain summary returned with public question list. */
export interface PublicDomainBrief {
  _id: string;
  title: string;
  description?: string;
  predefinedAssessmentTitle?: string;
}

export interface PublicQuestionsByDomainResult {
  domain: PublicDomainBrief;
  questions: Question[];
  totalCount: number;
}

export interface PublicSubmitAssessmentRequest {
  status: 'completed';
  domain: string;
  title: string;
  description: string;
  fullName: string;
  questions: Array<{
    question: string;
    answer: string | number | string[];
  }>;
}

@Injectable({ providedIn: 'root' })
export class PublicAssessmentService {
  private readonly apiUrl = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  listQuestionsByDomain(
    domainId: string,
  ): Observable<PublicQuestionsByDomainResult> {
    const params = new HttpParams().set('domain', domainId.trim());
    return this.http
      .get<ApiResponse<PublicQuestionsByDomainResult>>(
        `${this.apiUrl}/public/question`,
        { params },
      )
      .pipe(
        map((res) => {
          if (res.error || res.results == null) {
            throw new Error(String(res.message || 'Invalid response from server'));
          }
          return res.results;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        }),
      );
  }

  submitAssessment(
    body: PublicSubmitAssessmentRequest,
  ): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.apiUrl}/public/assessment`, body)
      .pipe(
        map((res) => {
          if (res.error) {
            throw new Error(String(res.message || 'Submit failed'));
          }
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        }),
      );
  }
}
