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
  Question,
  QuestionPaginatedResponse,
  CreateQuestionRequest,
  UpdateQuestionRequest,
} from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of questions
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @param search - Search term (optional)
   * @param sortBy - Field name to sort by (optional)
   * @param sortDirection - Sort direction: 'asc' or 'desc' (optional)
   * @param filters - Filter object with column keys and values (optional)
   * @returns Observable with paginated question data
   */
  findMany(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc',
    filters?: Record<string, string>
  ): Observable<QuestionPaginatedResponse> {
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
      .get<ApiResponse<QuestionPaginatedResponse>>(
        `${this.API_URL}/admin/question`,
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
   * Get a single question by ID
   * @param id - Question ID
   * @returns Observable with question data
   */
  findOne(id: string): Observable<Question> {
    return this.http
      .get<ApiResponse<{ question: Question }>>(
        `${this.API_URL}/admin/question/${id}`
      )
      .pipe(
        map((res) => {
          if (!res.results || !res.results.question) {
            throw new Error('Invalid response from server');
          }
          return res.results.question;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Create a new question
   * @param questionData - Question data to create
   * @returns Observable with created question data
   */
  create(questionData: CreateQuestionRequest): Observable<Question> {
    return this.http
      .post<ApiResponse<Question>>(`${this.API_URL}/admin/question`, questionData)
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return questionData as unknown as Question;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Create failed'));
          }
          return questionData as unknown as Question;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Update an existing question
   * @param questionData - Question data to update (must include _id)
   * @returns Observable with updated question data
   */
  update(questionData: UpdateQuestionRequest): Observable<Question> {
    return this.http
      .put<ApiResponse<Question>>(
        `${this.API_URL}/admin/question/update`,
        questionData
      )
      .pipe(
        map((res) => {
          if (res.error === false && res.results === null) {
            return questionData as unknown as Question;
          }
          if (res.results) {
            return res.results;
          }
          if (res.error === true) {
            throw new Error(String(res.message || 'Update failed'));
          }
          return questionData as unknown as Question;
        }),
        catchError((err: HttpErrorResponse) => {
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete one or more questions
   * @param ids - Single ID string or array of ID strings
   * @returns Observable with deletion result
   */
  delete(ids: string | string[]): Observable<any> {
    const idsParam = Array.isArray(ids) ? ids.join(',') : ids;

    return this.http
      .delete<ApiResponse<any>>(
        `${this.API_URL}/admin/question/delete/${idsParam}`
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

