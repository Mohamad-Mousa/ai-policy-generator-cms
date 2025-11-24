import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse, Setting, UpdateSettingRequest } from '@shared/interfaces';

@Injectable({ providedIn: 'root' })
export class SettingService {
  private readonly API_URL = environment.ApiUrl;

  constructor(private http: HttpClient) {}

  findOne(): Observable<Setting> {
    return this.http
      .get<ApiResponse<Setting | { setting?: Setting } | null>>(
        `${this.API_URL}/admin/setting`
      )
      .pipe(
        map((res) => this.normalizeSetting(this.unwrapSetting(res.results))),
        catchError((err) => this.handleError(err))
      );
  }

  update(payload: UpdateSettingRequest): Observable<Setting> {
    return this.http
      .put<ApiResponse<Setting | null>>(
        `${this.API_URL}/admin/setting/update`,
        payload
      )
      .pipe(
        map((res) => {
          const payloadOrResponse = this.unwrapSetting(res.results);
          if (payloadOrResponse) {
            return this.normalizeSetting(payloadOrResponse);
          }
          return this.normalizeSetting({
            contact: {
              email: payload.contact?.email ?? '',
              phone: payload.contact?.phone ?? '',
            },
            subscriptions: {
              notifications: payload.subscriptions?.notifications ?? true,
              emails: payload.subscriptions?.emails ?? true,
            },
            privacyPolicy: payload.privacyPolicy ?? '',
            termsAndConditions: payload.termsAndConditions ?? '',
            createdAt: undefined,
            updatedAt: undefined,
            _id: undefined,
          });
        }),
        catchError((err) => this.handleError(err))
      );
  }

  private unwrapSetting(
    results: Setting | { setting?: Setting } | null | undefined
  ): Setting | null {
    if (!results) {
      return null;
    }
    if ('contact' in results && 'privacyPolicy' in results) {
      return results as Setting;
    }
    if ('setting' in results) {
      return results.setting ?? null;
    }
    return null;
  }

  private normalizeSetting(setting?: Setting | null): Setting {
    return {
      _id: setting?._id,
      contact: {
        email: setting?.contact?.email ?? '',
        phone: this.normalizePhoneValue(setting?.contact?.phone),
      },
      subscriptions: {
        notifications: setting?.subscriptions?.notifications ?? true,
        emails: setting?.subscriptions?.emails ?? true,
      },
      privacyPolicy: setting?.privacyPolicy ?? '',
      termsAndConditions: setting?.termsAndConditions ?? '',
      createdAt: setting?.createdAt,
      updatedAt: setting?.updatedAt,
    };
  }

  private normalizePhoneValue(
    phone: Setting['contact']['phone']
  ): Setting['contact']['phone'] {
    if (!phone) {
      return undefined;
    }

    if (typeof phone === 'string') {
      return { formatted: phone, code: phone.split(' ')[0] };
    }

    if (phone.code && typeof phone.code === 'number') {
      return { ...phone, code: `+${phone.code}` };
    }

    return phone;
  }

  private handleError(err: HttpErrorResponse) {
    return throwError(() => err);
  }
}
