import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ButtonComponent } from '../../../shared/components/button/button';
import { FormInputComponent } from '@shared/components/form-input/form-input';
import { TextEditorComponent } from '@shared/components/text-editor/text-editor';
import { LoaderComponent } from '@shared/components/loader/loader';
import { NotificationService } from '@shared/components/notification/notification.service';
import { SettingService } from '@shared/services';
import { Setting, UpdateSettingRequest } from '@shared/interfaces';

@Component({
  selector: 'app-settings-section',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    FormInputComponent,
    TextEditorComponent,
    LoaderComponent,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private currentSetting: Setting | null = null;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly lastSavedAt = signal<string | null>(null);

  protected readonly settingsForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private settingService: SettingService,
    private notifications: NotificationService
  ) {
    this.settingsForm = this.fb.group({
      contact: this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        phone: this.fb.group({
          code: [''],
          number: [''],
        }),
      }),
      subscriptions: this.fb.group({
        notifications: [true],
        emails: [true],
      }),
      privacyPolicy: ['', [Validators.required, Validators.minLength(30)]],
      termsAndConditions: ['', [Validators.required, Validators.minLength(30)]],
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected saveSettings(): void {
    this.settingsForm.markAllAsTouched();

    if (this.settingsForm.invalid || this.isSaving()) {
      return;
    }

    const value = this.settingsForm.value;
    const payload: UpdateSettingRequest = {
      contact: {
        email: value.contact?.email ?? '',
        phone: this.buildPhonePayload(value.contact?.phone),
      },
      subscriptions: {
        notifications: !!value.subscriptions?.notifications,
        emails: !!value.subscriptions?.emails,
      },
      privacyPolicy: value.privacyPolicy ?? '',
      termsAndConditions: value.termsAndConditions ?? '',
    };

    this.isSaving.set(true);

    this.settingService
      .update(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.currentSetting = updated;
          this.patchForm(updated);
          this.notifications.success(
            'Settings updated successfully',
            'Settings saved'
          );
        },
        error: (error) => {
          this.isSaving.set(false);
          this.notifications.danger(
            error?.error?.message ||
              'Failed to update settings. Please try again.',
            'Settings save failed'
          );
        },
      });
  }

  protected resetToInitial(): void {
    if (this.currentSetting) {
      this.patchForm(this.currentSetting);
    } else {
      const snapshot = this.settingsForm.value;
      this.settingsForm.reset(snapshot);
      this.settingsForm.markAsPristine();
      this.settingsForm.markAsUntouched();
    }
  }

  protected get contactGroup(): FormGroup {
    return this.settingsForm.get('contact') as FormGroup;
  }

  protected get contactEmailControl(): AbstractControl | null {
    return this.contactGroup.get('email');
  }

  protected get contactPhoneGroup(): FormGroup | null {
    return this.contactGroup.get('phone') as FormGroup;
  }

  protected get contactPhoneCodeControl(): AbstractControl | null {
    return this.contactPhoneGroup?.get('code') ?? null;
  }

  protected get contactPhoneNumberControl(): AbstractControl | null {
    return this.contactPhoneGroup?.get('number') ?? null;
  }

  protected get privacyPolicyControl(): AbstractControl | null {
    return this.settingsForm.get('privacyPolicy');
  }

  protected get termsControl(): AbstractControl | null {
    return this.settingsForm.get('termsAndConditions');
  }

  protected get subscriptionsGroup(): FormGroup {
    return this.settingsForm.get('subscriptions') as FormGroup;
  }

  protected get saveButtonLabel(): string {
    return this.isSaving() ? 'Saving...' : 'Save changes';
  }

  protected get hasUnsavedChanges(): boolean {
    return this.settingsForm.dirty;
  }

  private loadSettings(): void {
    this.isLoading.set(true);
    this.settingService
      .findOne()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (setting) => {
          this.isLoading.set(false);
          this.currentSetting = setting;
          this.patchForm(setting);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.notifications.danger(
            error?.error?.message ||
              'Unable to load settings. Please try again later.',
            'Settings load failed'
          );
        },
      });
  }

  private patchForm(setting: Setting): void {
    this.settingsForm.reset(
      {
        contact: {
          email: setting.contact?.email ?? '',
          phone: this.mapPhoneToForm(setting.contact?.phone),
        },
        subscriptions: {
          notifications: setting.subscriptions?.notifications ?? true,
          emails: setting.subscriptions?.emails ?? true,
        },
        privacyPolicy: setting.privacyPolicy ?? '',
        termsAndConditions: setting.termsAndConditions ?? '',
      },
      { emitEvent: false }
    );
    this.settingsForm.markAsPristine();
    this.settingsForm.markAsUntouched();
    this.lastSavedAt.set(setting.updatedAt ?? setting.createdAt ?? null);
  }

  private mapPhoneToForm(phone: Setting['contact']['phone']): {
    code: string;
    number: string;
  } {
    if (!phone) {
      return { code: '', number: '' };
    }
    if (typeof phone === 'string') {
      const trimmed = phone.trim();
      if (!trimmed) {
        return { code: '', number: '' };
      }
      const [code, ...rest] = trimmed.split(/\s+/);
      return {
        code: code ?? '',
        number: rest.join(' ') ?? '',
      };
    }

    return {
      code:
        phone.code?.toString() ||
        phone.countryCode ||
        phone.formatted?.split(/\s+/)?.[0] ||
        '',
      number:
        phone.number?.toString() ||
        phone.nationalNumber?.toString() ||
        phone.formatted?.split(/\s+/)?.slice(1).join(' ') ||
        '',
    };
  }

  private buildPhonePayload(phoneGroupValue?: {
    code?: string;
    number?: string;
  }):
    | {
        code?: string;
        number?: string;
      }
    | undefined {
    if (!phoneGroupValue) {
      return undefined;
    }

    const code = phoneGroupValue.code?.toString().trim();
    const number = phoneGroupValue.number?.toString().trim();

    if (!code && !number) {
      return undefined;
    }

    return {
      code,
      number,
    };
  }
}
