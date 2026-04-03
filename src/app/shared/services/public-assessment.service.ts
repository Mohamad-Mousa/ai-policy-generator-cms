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

/** Response shape for GET /public/question?domains=id1,id2 */
export interface PublicQuestionsMultiResult {
  items: PublicQuestionsByDomainResult[];
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

export interface PublicBulkSubmitBody {
  assessments: PublicSubmitAssessmentRequest[];
}

export interface PublicBulkSubmitResults {
  assessments: unknown[];
  count: number;
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
      .get<ApiResponse<PublicQuestionsByDomainResult | PublicQuestionsMultiShape>>(
        `${this.apiUrl}/public/question`,
        { params },
      )
      .pipe(
        map((res) => this.unwrapSingleOrThrow(res)),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        }),
      );
  }

  /**
   * GET /public/question?domains=id1,id2 (comma-separated ObjectIds).
   * Expects results.items[]; normalizes legacy single-domain payloads when needed.
   */
  listQuestionsByDomains(
    domainIds: string[],
  ): Observable<PublicQuestionsMultiResult> {
    const trimmed = [...new Set(domainIds.map((id) => id.trim()).filter(Boolean))];
    if (!trimmed.length) {
      return throwError(() => new Error('At least one domain id is required.'));
    }
    const params = new HttpParams().set('domains', trimmed.join(','));
    return this.http
      .get<
        ApiResponse<PublicQuestionsMultiShape | PublicQuestionsByDomainResult>
      >(`${this.apiUrl}/public/question`, { params })
      .pipe(
        map((res) => {
          if (res.error || res.results == null) {
            throw new Error(String(res.message || 'Invalid response from server'));
          }
          return this.normalizeMultiResult(res.results);
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

  submitAssessmentsBulk(
    assessments: PublicSubmitAssessmentRequest[],
  ): Observable<PublicBulkSubmitResults> {
    return this.http
      .post<ApiResponse<PublicBulkSubmitResults>>(
        `${this.apiUrl}/public/assessment/bulk`,
        { assessments } satisfies PublicBulkSubmitBody,
      )
      .pipe(
        map((res) => {
          if (res.error || res.results == null) {
            throw new Error(String(res.message || 'Bulk submit failed'));
          }
          return res.results;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        }),
      );
  }

  private unwrapSingleOrThrow(
    res: ApiResponse<PublicQuestionsByDomainResult | PublicQuestionsMultiShape>,
  ): PublicQuestionsByDomainResult {
    if (res.error || res.results == null) {
      throw new Error(String(res.message || 'Invalid response from server'));
    }
    const results = res.results;
    if (this.isMultiShape(results)) {
      const first = results.items?.[0];
      if (!first) {
        throw new Error('No questions returned for this domain.');
      }
      return first;
    }
    return results as PublicQuestionsByDomainResult;
  }

  private normalizeMultiResult(
    results: PublicQuestionsMultiShape | PublicQuestionsByDomainResult,
  ): PublicQuestionsMultiResult {
    if (this.isMultiShape(results)) {
      const items = results.items ?? [];
      return {
        items,
        totalCount:
          typeof results.totalCount === 'number'
            ? results.totalCount
            : items.length,
      };
    }
    const single = results as PublicQuestionsByDomainResult;
    if (single.domain && Array.isArray(single.questions)) {
      return {
        items: [single],
        totalCount: single.totalCount ?? single.questions.length,
      };
    }
    throw new Error('Invalid multi-domain question response from server.');
  }

  private isMultiShape(
    r: PublicQuestionsMultiShape | PublicQuestionsByDomainResult,
  ): r is PublicQuestionsMultiShape {
    return (
      r != null &&
      typeof r === 'object' &&
      'items' in r &&
      Array.isArray((r as PublicQuestionsMultiShape).items)
    );
  }
}

/** Raw API shape for GET with `domains=`. */
interface PublicQuestionsMultiShape {
  items: PublicQuestionsByDomainResult[];
  totalCount?: number;
}
