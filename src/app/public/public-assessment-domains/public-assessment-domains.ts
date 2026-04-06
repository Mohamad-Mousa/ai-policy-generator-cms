import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  PublicAssessmentService,
  PublicDomainBrief,
  PublicQuestionsByDomainResult,
  PublicSubmitAssessmentRequest,
} from '@shared/services';
import { NotificationService } from '@shared/components/notification/notification.service';
import { LoaderComponent } from '@shared/components/loader/loader';
import { Question, questionAnswerOptionLabels } from '@shared/interfaces';
import {
  publicQuestionsAnsweredCount,
  publicQuestionsProgressPercent,
} from '@shared/utils/public-assessment-question-progress';

type MultiStep =
  | 'loading'
  | 'select'
  | 'fill'
  | 'review'
  | 'submitted'
  | 'error';

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

interface DomainDraft {
  domainId: string;
  domain: PublicDomainBrief;
  assessmentTitle: string;
  /** Per-domain optional note (submitted with that assessment). */
  description: string;
  questions: PublicQuestionItem[];
}

const DOC_TITLE_BRAND = 'Policy Generator AI';

@Component({
  selector: 'app-public-assessment-domains',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent],
  templateUrl: './public-assessment-domains.html',
  styleUrl: './public-assessment-domains.scss',
})
export class PublicAssessmentDomainsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly publicAssessmentService = inject(PublicAssessmentService);
  private readonly notifications = inject(NotificationService);
  private readonly destroy$ = new Subject<void>();

  protected readonly step = signal<MultiStep>('loading');
  protected readonly isSubmitting = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly fillIndex = signal(0);

  /** Order of ids from the `domains` query param. */
  protected urlDomainOrder: string[] = [];
  /** Items returned from API keyed by domain _id. */
  protected loadedById = new Map<string, PublicQuestionsByDomainResult>();
  /** User-selected domain ids for this run (subset of loaded). */
  protected selectedIds = new Set<string>();
  /** Ordered ids for the fill + review + submit flow. */
  protected activeSequence: string[] = [];
  /** Persisted answers per domain. */
  protected drafts: Record<string, DomainDraft> = {};
  /** Single respondent name for every assessment in this flow. */
  protected respondentFullName = '';

  ngOnInit(): void {
    this.setDocumentTitle('Multi assessment');
    const raw = this.route.snapshot.queryParamMap.get('domains');
    this.urlDomainOrder = this.parseDomainIds(raw);
    if (!this.urlDomainOrder.length) {
      this.step.set('error');
      this.loadError.set(
        'Add a domains query parameter with one or more domain IDs, e.g. ?domains=id1,id2',
      );
      this.setDocumentTitle('Invalid link');
      return;
    }

    this.publicAssessmentService
      .listQuestionsByDomains(this.urlDomainOrder)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loadedById.clear();
          for (const item of res.items) {
            const id = item.domain?._id;
            if (id) {
              this.loadedById.set(id, item);
            }
          }
          this.selectedIds = new Set(
            this.urlDomainOrder.filter((id) => this.loadedById.has(id)),
          );
          if (!this.selectedIds.size) {
            this.step.set('error');
            this.loadError.set('No domains could be loaded for the given IDs.');
            this.setDocumentTitle('Assessment unavailable');
            return;
          }
          this.step.set('select');
          this.loadError.set(null);
          this.setDocumentTitle('Choose domains');
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          const msg =
            err?.error?.message ||
            err?.message ||
            'Could not load domains and questions.';
          this.loadError.set(msg);
          this.step.set('error');
          this.setDocumentTitle('Assessment unavailable');
          this.notifications.danger(msg, 'Load failed');
        },
      });
  }

  ngOnDestroy(): void {
    this.title.setTitle(DOC_TITLE_BRAND);
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected domainsForSelect(): PublicQuestionsByDomainResult[] {
    return this.urlDomainOrder
      .map((id) => this.loadedById.get(id))
      .filter((x): x is PublicQuestionsByDomainResult => !!x);
  }

  protected toggleDomain(id: string): void {
    const next = new Set(this.selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds = next;
  }

  protected isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  protected stepDomainTitle(id: string): string {
    return this.loadedById.get(id)?.domain?.title ?? id;
  }

  protected startAssessments(): void {
    const order = this.urlDomainOrder.filter((id) => this.selectedIds.has(id));
    if (!order.length) {
      this.notifications.warning(
        'Select at least one domain to continue.',
        'Selection required',
      );
      return;
    }
    this.activeSequence = order;
    for (const id of order) {
      if (!this.drafts[id]) {
        const src = this.loadedById.get(id);
        if (src) {
          this.drafts[id] = this.createDraft(src);
        }
      }
    }
    this.fillIndex.set(0);
    this.step.set('fill');
    this.setDocumentTitle('Assessment');
  }

  protected currentDraft(): DomainDraft | null {
    const seq = this.activeSequence;
    const i = this.fillIndex();
    if (i < 0 || i >= seq.length) {
      return null;
    }
    return this.drafts[seq[i]] ?? null;
  }

  protected progressPercent(): number {
    const n = this.activeSequence.length;
    if (n <= 0) {
      return 0;
    }
    return Math.round(((this.fillIndex() + 1) / n) * 100);
  }

  /** Question-level completion for one domain in the multi flow (0–100). */
  protected draftQuestionsProgressPercent(domainId: string): number {
    const d = this.drafts[domainId];
    return d ? publicQuestionsProgressPercent(d.questions) : 0;
  }

  protected draftQuestionsAnsweredLabel(domainId: string): string {
    const d = this.drafts[domainId];
    if (!d) {
      return '0 / 0';
    }
    const c = publicQuestionsAnsweredCount(d.questions);
    return `${c} / ${d.questions.length}`;
  }

  protected reviewRowQuestionsProgressPercent(row: DomainDraft): number {
    return publicQuestionsProgressPercent(row.questions);
  }

  protected reviewRowQuestionsAnsweredLabel(row: DomainDraft): string {
    const c = publicQuestionsAnsweredCount(row.questions);
    return `${c} / ${row.questions.length}`;
  }

  protected backToLastDomainFromReview(): void {
    if (this.activeSequence.length === 0) {
      return;
    }
    this.fillIndex.set(this.activeSequence.length - 1);
    this.step.set('fill');
    this.setDocumentTitle('Assessment');
  }

  protected goNextFromFill(): void {
    if (!this.validateRespondentName()) {
      return;
    }
    const draft = this.currentDraft();
    if (!draft || !this.validateDraft(draft)) {
      return;
    }
    const i = this.fillIndex();
    if (i < this.activeSequence.length - 1) {
      this.fillIndex.set(i + 1);
    } else {
      this.step.set('review');
      this.setDocumentTitle('Review');
    }
  }

  protected goBackFromFill(): void {
    const i = this.fillIndex();
    if (i > 0) {
      this.fillIndex.set(i - 1);
    } else {
      this.step.set('select');
      this.setDocumentTitle('Choose domains');
    }
  }

  protected reviewRows(): DomainDraft[] {
    return this.activeSequence
      .map((id) => this.drafts[id])
      .filter((d): d is DomainDraft => !!d);
  }

  protected editFromReview(index: number): void {
    if (index >= 0 && index < this.activeSequence.length) {
      this.fillIndex.set(index);
      this.step.set('fill');
      this.setDocumentTitle('Assessment');
    }
  }

  protected submitAll(): void {
    if (this.isSubmitting()) {
      return;
    }
    if (!this.validateRespondentName()) {
      return;
    }
    for (const id of this.activeSequence) {
      const d = this.drafts[id];
      if (d && !this.validateDraft(d)) {
        this.notifications.warning(
          'Complete every assessment before submitting.',
          'Incomplete',
        );
        return;
      }
    }

    const assessments: PublicSubmitAssessmentRequest[] =
      this.activeSequence.map((id) => this.toSubmitPayload(this.drafts[id]));

    this.isSubmitting.set(true);
    this.publicAssessmentService
      .submitAssessmentsBulk(assessments)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.step.set('submitted');
          this.setDocumentTitle('Thank you');
          this.notifications.success(
            `Submitted ${res.count} assessment(s) successfully.`,
            'Complete',
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

  protected isAnswerSelected(
    answerValue: string | string[] | number | undefined,
    option: string,
  ): boolean {
    if (!Array.isArray(answerValue)) {
      return false;
    }
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
      if (!arr.includes(option)) {
        arr.push(option);
      }
    } else {
      const idx = arr.indexOf(option);
      if (idx > -1) {
        arr.splice(idx, 1);
      }
    }
  }

  protected onNumberChange(
    question: PublicQuestionItem,
    value: string,
  ): void {
    if (value === '' || value == null) {
      question.answer = undefined;
      return;
    }
    const n = Number(value);
    question.answer = Number.isFinite(n) ? n : undefined;
  }

  private parseDomainIds(raw: string | null): string[] {
    if (!raw?.trim()) {
      return [];
    }
    return [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
  }

  private createDraft(src: PublicQuestionsByDomainResult): DomainDraft {
    const predefined = src.domain.predefinedAssessmentTitle?.trim();
    const assessmentTitle =
      predefined && predefined.length > 0
        ? predefined
        : src.domain.title?.trim() || 'Assessment';
    return {
      domainId: src.domain._id,
      domain: src.domain,
      assessmentTitle,
      description: '',
      questions: (src.questions ?? []).map((q) => this.mapQuestion(q)),
    };
  }

  private mapQuestion(q: Question): PublicQuestionItem {
    return {
      id: q._id,
      text: q.question,
      type: q.type || 'text',
      required: true,
      options: questionAnswerOptionLabels(q.answers),
      min: q.min,
      max: q.max,
      answer:
        q.type === 'checkbox' ? [] : q.type === 'number' ? undefined : '',
    };
  }

  private validateRespondentName(): boolean {
    if (!this.respondentFullName.trim()) {
      this.notifications.warning(
        'Please enter your full name once; it applies to every assessment.',
        'Required field',
      );
      return false;
    }
    return true;
  }

  private validateDraft(d: DomainDraft): boolean {
    for (const q of d.questions) {
      if (!q.required) {
        continue;
      }
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

  private toSubmitPayload(d: DomainDraft): PublicSubmitAssessmentRequest {
    const questions = d.questions.map((q) => {
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
    return {
      status: 'completed',
      domain: d.domainId,
      title: d.assessmentTitle,
      description: d.description.trim(),
      fullName: this.respondentFullName.trim(),
      questions,
    };
  }

  private setDocumentTitle(pageSegment: string): void {
    const part = pageSegment.trim() || 'Assessment';
    this.title.setTitle(`${part} · ${DOC_TITLE_BRAND}`);
  }
}
