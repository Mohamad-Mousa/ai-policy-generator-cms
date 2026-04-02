import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  PublicAssessmentService,
  PublicDomainBrief,
} from '@shared/services';
import { NotificationService } from '@shared/components/notification/notification.service';
import { LoaderComponent } from '@shared/components/loader/loader';
import {
  questionAnswerOptionLabels,
} from '@shared/interfaces';

interface PublicQuestionItem {
  id: string;
  text: string;
  type: 'text' | 'radio' | 'checkbox' | 'number';
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  answer?: string | string[] | number;
}

const SUBMITTED_STORAGE_PREFIX = 'pg_public_assessment_submitted:';

@Component({
  selector: 'app-public-assessment',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent],
  templateUrl: './public-assessment.html',
  styleUrl: './public-assessment.scss',
})
export class PublicAssessmentComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly publicAssessmentService = inject(PublicAssessmentService);
  private readonly notifications = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitted = signal(false);

  protected domainId = '';
  protected domainMeta: PublicDomainBrief | null = null;
  /** Title sent on submit: predefinedAssessmentTitle or domain title. */
  protected assessmentTitle = '';
  protected fullName = '';
  protected assessmentDescription = '';
  protected questions: PublicQuestionItem[] = [];

  ngOnInit(): void {
    this.domainId = this.route.snapshot.paramMap.get('domainId')?.trim() ?? '';
    if (!this.domainId) {
      this.loadError.set('Invalid link: missing domain.');
      this.isLoading.set(false);
      return;
    }
    if (this.readSubmittedFlag(this.domainId)) {
      this.submitted.set(true);
      this.isLoading.set(false);
      return;
    }
    this.publicAssessmentService
      .listQuestionsByDomain(this.domainId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.domainMeta = res.domain;
          const predefined = res.domain.predefinedAssessmentTitle?.trim();
          this.assessmentTitle =
            predefined && predefined.length > 0
              ? predefined
              : res.domain.title?.trim() || 'Assessment';
          this.questions = (res.questions ?? []).map((q) => ({
            id: q._id,
            text: q.question,
            type: q.type || 'text',
            required: true,
            options: questionAnswerOptionLabels(q.answers),
            min: q.min,
            max: q.max,
            answer:
              q.type === 'checkbox'
                ? []
                : q.type === 'number'
                  ? undefined
                  : '',
          }));
          this.isLoading.set(false);
          this.loadError.set(null);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.isLoading.set(false);
          const msg =
            err?.error?.message ||
            err?.message ||
            'Could not load questions for this domain.';
          this.loadError.set(msg);
          this.notifications.danger(msg, 'Load failed');
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected isAnswerSelected(
    answerValue: string | string[] | number | undefined,
    option: string,
  ): boolean {
    if (!Array.isArray(answerValue)) return false;
    return answerValue.includes(option);
  }

  protected onCheckboxChange(
    event: Event,
    question: PublicQuestionItem,
    option: string,
  ): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (!Array.isArray(question.answer)) {
      question.answer = [];
    }
    const arr = question.answer as string[];
    if (checked) {
      if (!arr.includes(option)) arr.push(option);
    } else {
      const i = arr.indexOf(option);
      if (i > -1) arr.splice(i, 1);
    }
  }

  protected onNumberChange(question: PublicQuestionItem, value: string): void {
    if (value === '' || value == null) {
      question.answer = undefined;
      return;
    }
    const n = Number(value);
    question.answer = Number.isFinite(n) ? n : undefined;
  }

  private validate(): boolean {
    if (!this.fullName.trim()) {
      this.notifications.warning(
        'Please enter your full name.',
        'Required field',
      );
      return false;
    }
    for (const q of this.questions) {
      if (!q.required) continue;
      if (q.type === 'checkbox') {
        const a = q.answer;
        if (!Array.isArray(a) || a.length === 0) {
          this.notifications.warning(
            `Please answer: ${q.text}`,
            'Incomplete',
          );
          return false;
        }
      } else if (q.type === 'number') {
        if (
          q.answer === undefined ||
          q.answer === null ||
          (typeof q.answer === 'number' && Number.isNaN(q.answer))
        ) {
          this.notifications.warning(
            `Please answer: ${q.text}`,
            'Incomplete',
          );
          return false;
        }
      } else {
        const s = q.answer != null ? String(q.answer).trim() : '';
        if (!s) {
          this.notifications.warning(
            `Please answer: ${q.text}`,
            'Incomplete',
          );
          return false;
        }
      }
    }
    return true;
  }

  protected submit(): void {
    if (this.isSubmitting() || !this.validate()) {
      return;
    }
    this.isSubmitting.set(true);
    const payloadQuestions = this.questions.map((q) => {
      let answer: string | string[] | number;
      if (q.type === 'checkbox') {
        answer = Array.isArray(q.answer) ? q.answer : [];
      } else if (q.type === 'number') {
        answer =
          typeof q.answer === 'number'
            ? q.answer
            : q.answer !== undefined &&
                q.answer !== null &&
                String(q.answer) !== ''
              ? Number(q.answer)
              : '';
      } else {
        answer =
          q.answer !== undefined && q.answer !== null ? String(q.answer) : '';
      }
      return { question: q.id, answer };
    });

    this.publicAssessmentService
      .submitAssessment({
        status: 'completed',
        domain: this.domainId,
        title: this.assessmentTitle,
        description: this.assessmentDescription.trim(),
        fullName: this.fullName.trim(),
        questions: payloadQuestions,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.writeSubmittedFlag(this.domainId);
          this.isSubmitting.set(false);
          this.submitted.set(true);
          this.notifications.success(
            'Your assessment was submitted successfully.',
            'Thank you',
          );
        },
        error: (err: { error?: { message?: string } }) => {
          this.isSubmitting.set(false);
          this.notifications.danger(
            err?.error?.message ||
              'Submission failed. Please try again later.',
            'Submit failed',
          );
        },
      });
  }

  private readSubmittedFlag(domainId: string): boolean {
    if (!domainId) {
      return false;
    }
    const key = SUBMITTED_STORAGE_PREFIX + domainId;
    try {
      if (typeof localStorage !== 'undefined') {
        if (localStorage.getItem(key) === '1') {
          return true;
        }
      }
    } catch {
      /* ignore */
    }
    try {
      if (typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem(key) === '1';
      }
    } catch {
      /* ignore */
    }
    return false;
  }

  private writeSubmittedFlag(domainId: string): void {
    if (!domainId) {
      return;
    }
    const key = SUBMITTED_STORAGE_PREFIX + domainId;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, '1');
      }
    } catch {
      /* storage disabled or quota */
    }
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, '1');
      }
    } catch {
      /* storage disabled or quota */
    }
  }
}
