import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button';
import { LoaderComponent } from '@shared/components/loader/loader';
import {
  Domain,
  Question as DbQuestion,
  Assessment as ApiAssessment,
  AssessmentQuestion as ApiAssessmentQuestion,
} from '@shared/interfaces';
import { NotificationService } from '@shared/components/notification/notification.service';
import {
  DialogButton,
  DialogComponent,
} from '@shared/components/dialog/dialog';
import { QuestionService, AssessmentService } from '@shared/services';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface AssessmentDomain {
  id: string;
  name: string;
  description: string;
  icon: string;
  completed: boolean;
  progress: number;
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
  type: 'text' | 'radio' | 'checkbox' | 'number';
  required: boolean;
  answers?: string[]; // For radio/checkbox types
  min?: number; // For number type
  max?: number; // For number type
  answer?: any; // string for text, string for radio, string[] for checkbox, number for number
  evidenceFiles?: File[];
}

interface AssessmentDomainTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  questions: Question[];
}

interface Assessment {
  id?: string;
  name: string;
  description: string;
  fullName: string;
  createdAt: Date;
  updatedAt?: Date;
  domains: AssessmentDomain[];
  overallProgress: number;
  domainId: string | null;
  domainTitle?: string;
  isCompleted?: boolean;
}

@Component({
  selector: 'app-assessment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    DialogComponent,
    LoaderComponent,
  ],
  templateUrl: './assessment.html',
  styleUrl: './assessment.scss',
})
export class AssessmentComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  protected assessment: Assessment = {
    name: '',
    description: '',
    fullName: '',
    createdAt: new Date(),
    domains: [],
    overallProgress: 0,
    domainId: null,
    domainTitle: '',
  };

  protected currentDomainIndex = 0;
  protected currentQuestionIndex = 0;
  protected readonly isSaving = signal(false);
  protected readonly isLoadingAssessment = signal(false);
  protected readonly isLoadingQuestions = signal(false);
  protected selectedDomain?: Domain;
  protected isCancelDialogOpen = false;
  protected hasUnsavedChanges = false;
  private pendingAnswers: ApiAssessmentQuestion[] | null = null;

  protected readonly domainTemplates: Record<string, AssessmentDomainTemplate> =
    {
      'technological-infrastructure': {
        id: 'technological-infrastructure',
        name: 'Technological Infrastructure',
        description:
          'Assess IT infrastructure, cloud capabilities, and technical readiness',
        icon: 'cloud',
        questions: [
          {
            id: 'ti-1',
            text: 'What is your current cloud infrastructure setup?',
            type: 'radio',
            required: true,
            answers: [
              'Fully cloud-based',
              'Hybrid cloud',
              'On-premise',
              'Mixed',
            ],
          },
          {
            id: 'ti-2',
            text: 'Describe your current AI/ML infrastructure capabilities',
            type: 'text',
            required: true,
          },
          {
            id: 'ti-3',
            text: 'What AI/ML tools and platforms are currently in use?',
            type: 'text',
            required: false,
          },
          {
            id: 'ti-4',
            text: 'Upload evidence documents related to infrastructure (optional)',
            type: 'text',
            required: false,
          },
        ],
      },
      'data-ecosystem': {
        id: 'data-ecosystem',
        name: 'Data Ecosystem',
        description: 'Evaluate data quality, governance, and availability',
        icon: 'database',
        questions: [
          {
            id: 'de-1',
            text: 'How would you rate your data quality?',
            type: 'radio',
            required: true,
            answers: ['Excellent', 'Good', 'Moderate', 'Poor'],
          },
          {
            id: 'de-2',
            text: 'Describe your data governance framework',
            type: 'text',
            required: true,
          },
          {
            id: 'de-3',
            text: 'What data sources are available for AI initiatives?',
            type: 'text',
            required: false,
          },
          {
            id: 'de-4',
            text: 'Upload data governance documentation (optional)',
            type: 'text',
            required: false,
          },
        ],
      },
      'human-capital': {
        id: 'human-capital',
        name: 'Human Capital',
        description: 'Review workforce skills, training, and AI expertise',
        icon: 'groups',
        questions: [
          {
            id: 'hc-1',
            text: 'How many employees have AI/ML expertise?',
            type: 'radio',
            required: true,
            answers: ['0-5', '6-20', '21-50', '50+'],
          },
          {
            id: 'hc-2',
            text: 'Describe your AI training and development programs',
            type: 'text',
            required: true,
          },
          {
            id: 'hc-3',
            text: 'What recruitment strategies are in place for AI talent?',
            type: 'text',
            required: false,
          },
          {
            id: 'hc-4',
            text: 'Upload training documentation or certifications (optional)',
            type: 'text',
            required: false,
          },
        ],
      },
      'government-policy-and-regulation': {
        id: 'government-policy',
        name: 'Government Policy & Regulation',
        description: 'Analyze regulatory framework and policy alignment',
        icon: 'gavel',
        questions: [
          {
            id: 'gp-1',
            text: 'How well-aligned is your organization with current AI regulations?',
            type: 'radio',
            required: true,
            answers: [
              'Fully aligned',
              'Mostly aligned',
              'Partially aligned',
              'Not aligned',
            ],
          },
          {
            id: 'gp-2',
            text: 'Describe your compliance framework for AI governance',
            type: 'text',
            required: true,
          },
          {
            id: 'gp-3',
            text: 'What regulatory challenges do you face?',
            type: 'text',
            required: false,
          },
          {
            id: 'gp-4',
            text: 'Upload compliance documentation (optional)',
            type: 'text',
            required: false,
          },
        ],
      },
      'ai-innovation-and-economic-drivers': {
        id: 'ai-innovation',
        name: 'AI Innovation & Economic Drivers',
        description: 'Examine innovation ecosystem and economic factors',
        icon: 'trending_up',
        questions: [
          {
            id: 'ai-1',
            text: "What is your organization's AI innovation strategy?",
            type: 'radio',
            required: true,
            answers: [
              'Aggressive expansion',
              'Moderate growth',
              'Cautious exploration',
              'No strategy',
            ],
          },
          {
            id: 'ai-2',
            text: 'Describe your AI research and development initiatives',
            type: 'text',
            required: true,
          },
          {
            id: 'ai-3',
            text: 'What economic factors drive your AI investments?',
            type: 'text',
            required: false,
          },
          {
            id: 'ai-4',
            text: 'Upload innovation strategy documents (optional)',
            type: 'text',
            required: false,
          },
        ],
      },
      default: {
        id: 'default-domain',
        name: 'AI Readiness',
        description: 'General AI readiness questions',
        icon: 'quiz',
        questions: [
          {
            id: 'default-1',
            text: 'Describe the primary AI objectives for this domain.',
            type: 'text',
            required: true,
          },
          {
            id: 'default-2',
            text: 'List key stakeholders involved in AI initiatives for this domain.',
            type: 'text',
            required: false,
          },
          {
            id: 'default-3',
            text: 'What challenges limit AI adoption in this area?',
            type: 'text',
            required: true,
          },
        ],
      },
    };

  constructor(
    private router: Router,
    private notifications: NotificationService,
    private questionService: QuestionService,
    private assessmentService: AssessmentService
  ) {}

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    const domainFromState =
      (navigation?.extras?.state?.['domain'] as Domain | undefined) ??
      (history.state?.['domain'] as Domain | undefined);
    const assessmentIdFromState =
      (navigation?.extras?.state?.['assessmentId'] as string | undefined) ??
      (history.state?.['assessmentId'] as string | undefined);

    if (!domainFromState?._id) {
      this.notifications.info(
        'Please select a domain from the AI readiness page before creating an assessment.',
        'Domain required'
      );
      this.router.navigate(['/dashboard/ai-readiness-assessment']);
      return;
    }

    this.selectedDomain = domainFromState;
    this.assessment.domainId = domainFromState._id;
    this.assessment.domainTitle = domainFromState.title;

    if (assessmentIdFromState) {
      // Editing existing assessment: show assessment loader and load data
      this.isLoadingAssessment.set(true);
      this.loadExistingAssessment(assessmentIdFromState);
    }

    // Always load questions for the domain
    this.loadQuestionsForDomain(domainFromState._id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get currentDomain(): AssessmentDomain | null {
    if (!this.assessment.domains || this.assessment.domains.length === 0) {
      return null;
    }
    return this.assessment.domains[this.currentDomainIndex] || null;
  }

  protected get currentQuestion(): Question | null {
    if (!this.currentDomain) {
      return null;
    }
    return this.currentDomain.questions[this.currentQuestionIndex] || null;
  }

  protected get hasPreviousQuestion(): boolean {
    return this.currentQuestionIndex > 0;
  }

  protected get hasNextQuestion(): boolean {
    if (!this.currentDomain) {
      return false;
    }
    return this.currentQuestionIndex < this.currentDomain.questions.length - 1;
  }

  protected get hasPreviousDomain(): boolean {
    return this.currentDomainIndex > 0;
  }

  protected get hasNextDomain(): boolean {
    return this.currentDomainIndex < this.assessment.domains.length - 1;
  }

  protected get canCompleteDomain(): boolean {
    if (!this.currentDomain) {
      return false;
    }
    return this.currentDomain.questions.every((q) => {
      if (q.required) {
        if (q.type === 'checkbox') {
          return Array.isArray(q.answer) && q.answer.length > 0;
        }
        if (q.type === 'number') {
          return q.answer !== undefined && q.answer !== null && q.answer !== '';
        }
        return q.answer !== undefined && q.answer !== null && q.answer !== '';
      }
      return true;
    });
  }

  protected previousQuestion() {
    if (this.hasPreviousQuestion) {
      this.currentQuestionIndex--;
    } else if (this.hasPreviousDomain && this.currentDomain) {
      this.currentDomainIndex--;
      this.currentQuestionIndex = this.currentDomain.questions.length - 1;
    }
    this.calculateProgress();
  }

  protected nextQuestion() {
    if (this.hasNextQuestion) {
      this.currentQuestionIndex++;
    } else if (this.hasNextDomain) {
      this.currentDomainIndex++;
      this.currentQuestionIndex = 0;
    }
    this.calculateProgress();
  }

  protected selectDomain(index: number) {
    this.currentDomainIndex = index;
    this.currentQuestionIndex = 0;
    this.calculateProgress();
  }

  protected onFileChange(event: Event, question: Question) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      question.evidenceFiles = Array.from(input.files);
      this.handleAnswerChange();
    }
  }

  protected removeFile(question: Question, index: number) {
    if (question.evidenceFiles) {
      question.evidenceFiles.splice(index, 1);
      this.handleAnswerChange();
    }
  }

  protected isAnswerSelected(selectedAnswers: any, answer: string): boolean {
    if (!selectedAnswers) {
      return false;
    }
    if (Array.isArray(selectedAnswers)) {
      return selectedAnswers.includes(answer);
    }
    return selectedAnswers === answer;
  }

  protected onCheckboxChange(event: Event, question: Question, answer: string) {
    const checkbox = event.target as HTMLInputElement;
    if (!Array.isArray(question.answer)) {
      question.answer = [];
    }
    const answerArray = question.answer as string[];
    if (checkbox.checked) {
      if (!answerArray.includes(answer)) {
        answerArray.push(answer);
      }
    } else {
      const index = answerArray.indexOf(answer);
      if (index > -1) {
        answerArray.splice(index, 1);
      }
    }
    this.handleAnswerChange();
  }

  protected onNumberChange(question: Question, value: string) {
    if (value === '' || value === null || value === undefined) {
      question.answer = undefined;
    } else {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        question.answer = numValue;
      }
    }
    this.handleAnswerChange();
  }

  protected calculateProgress() {
    this.assessment.domains.forEach((domain) => {
      const answeredQuestions = domain.questions.filter((q) => {
        if (q.required) {
          if (q.type === 'checkbox') {
            return Array.isArray(q.answer) && q.answer.length > 0;
          }
          if (q.type === 'number') {
            return q.answer !== undefined && q.answer !== null && q.answer !== '';
          }
          return q.answer !== undefined && q.answer !== null && q.answer !== '';
        }
        return true;
      }).length;
      domain.progress = (answeredQuestions / domain.questions.length) * 100;
      domain.completed = domain.progress === 100 && this.canCompleteDomain;
    });

    const totalProgress = this.assessment.domains.reduce(
      (sum, domain) => sum + domain.progress,
      0
    );
    this.assessment.overallProgress =
      totalProgress / this.assessment.domains.length;
  }

  protected handleAnswerChange() {
    this.markAsDirty();
    this.calculateProgress();
  }

  protected saveAssessment() {
    // For draft status, only title is required
    if (!this.assessment.name) {
      this.notifications.danger(
        'Assessment name is required to save as draft.',
        'Validation error'
      );
      return;
    }

    this.isSaving.set(true);

    // Map questions to API format: { question: ObjectId, answer: type-specific }
    // Only include questions with answers for draft saves
    const questions =
      this.currentDomain?.questions
        .filter((q) => {
          if (q.type === 'checkbox') {
            return Array.isArray(q.answer) && q.answer.length > 0;
          }
          if (q.type === 'number') {
            return q.answer !== undefined && q.answer !== null && q.answer !== '';
          }
          return q.answer !== undefined && q.answer !== null && q.answer !== '';
        })
        .map((q) => {
          let answer: string | string[] | number;
          if (q.type === 'checkbox') {
            // Send checkbox answers as array
            answer = Array.isArray(q.answer) ? q.answer : [];
          } else if (q.type === 'number') {
            // Send number answers as number
            answer = typeof q.answer === 'number' ? q.answer : Number(q.answer);
          } else {
            // Send text/radio answers as string
            answer = String(q.answer || '');
          }
          return {
            question: q.id,
            answer: answer,
          };
        }) || [];

    if (this.assessment.id) {
      // Update existing assessment as draft
      this.assessmentService
        .update({
          _id: this.assessment.id,
          title: this.assessment.name,
          ...(this.assessment.description && {
            description: this.assessment.description,
          }),
          ...(this.assessment.fullName && {
            fullName: this.assessment.fullName,
          }),
          ...(this.assessment.domainId && { domain: this.assessment.domainId }),
          questions: questions,
          status: 'draft',
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving.set(false);
            this.assessment.id = response._id;
            this.notifications.success(
              'Progress saved successfully as draft.',
              'Assessment updated'
            );
            this.hasUnsavedChanges = false;
          },
          error: (error) => {
            this.isSaving.set(false);
            console.error('Failed to save assessment', error);
            this.notifications.danger(
              error.error?.message ||
                'Failed to save assessment. Please try again.',
              'Save failed'
            );
          },
        });
    } else {
      // Create new assessment as draft
      this.assessmentService
        .create({
          ...(this.assessment.domainId && { domain: this.assessment.domainId }),
          title: this.assessment.name,
          ...(this.assessment.description && {
            description: this.assessment.description,
          }),
          ...(this.assessment.fullName && {
            fullName: this.assessment.fullName,
          }),
          questions: questions,
          status: 'draft',
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving.set(false);
            this.assessment.id = response._id;
            this.notifications.success(
              'Progress saved successfully as draft.',
              'Assessment created'
            );
            this.hasUnsavedChanges = false;
          },
          error: (error) => {
            this.isSaving.set(false);
            console.error('Failed to create assessment', error);
            this.notifications.danger(
              error.error?.message ||
                'Failed to create assessment. Please try again.',
              'Create failed'
            );
          },
        });
    }
  }

  protected completeAssessment() {
    if (!this.assessment.domainId) {
      this.notifications.danger(
        'Domain is required to complete assessment.',
        'Validation error'
      );
      return;
    }

    if (!this.assessment.name) {
      this.notifications.danger(
        'Assessment name is required.',
        'Validation error'
      );
      return;
    }

    if (!this.assessment.description) {
      this.notifications.danger(
        'Description is required to complete assessment.',
        'Validation error'
      );
      return;
    }

    if (!this.assessment.fullName) {
      this.notifications.danger(
        'Full name is required to complete assessment.',
        'Validation error'
      );
      return;
    }

    if (!this.canCompleteDomain) {
      this.notifications.info(
        'Please answer all required questions before completing the assessment.',
        'Incomplete assessment'
      );
      return;
    }

    this.isSaving.set(true);

    // Map all questions to API format: { question: ObjectId, answer: type-specific }
    // Include all questions when completing (required questions must have answers)
    const questions =
      this.currentDomain?.questions.map((q) => {
        let answer: string | string[] | number;
        if (q.type === 'checkbox') {
          // Send checkbox answers as array
          answer = Array.isArray(q.answer) ? q.answer : [];
        } else if (q.type === 'number') {
          // Send number answers as number
          answer = typeof q.answer === 'number' ? q.answer : (q.answer !== undefined && q.answer !== null && q.answer !== '' ? Number(q.answer) : '');
        } else {
          // Send text/radio answers as string
          answer = q.answer !== undefined && q.answer !== null ? String(q.answer) : '';
        }
        return {
          question: q.id,
          answer: answer,
        };
      }) || [];

    if (this.assessment.id) {
      // Update existing assessment as completed
      this.assessmentService
        .update({
          _id: this.assessment.id,
          domain: this.assessment.domainId,
          title: this.assessment.name,
          description: this.assessment.description,
          fullName: this.assessment.fullName,
          questions: questions,
          status: 'completed',
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving.set(false);
            this.notifications.success(
              'Assessment completed successfully!',
              'Assessment completed'
            );

            this.router.navigate(['/dashboard/readiness-reports'], {
              state: {
                domain: this.selectedDomain,
              },
            });
          },
          error: (error) => {
            this.isSaving.set(false);
            console.error('Failed to complete assessment', error);
            this.notifications.danger(
              error.error?.message ||
                'Failed to complete assessment. Please try again.',
              'Complete failed'
            );
          },
        });
    } else {
      // Create new completed assessment
      this.assessmentService
        .create({
          domain: this.assessment.domainId,
          title: this.assessment.name,
          description: this.assessment.description,
          fullName: this.assessment.fullName,
          questions: questions,
          status: 'completed',
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isSaving.set(false);
            this.assessment.id = response._id;
            this.notifications.success(
              'Assessment completed successfully!',
              'Assessment completed'
            );

            this.router.navigate(['/dashboard/readiness-reports'], {
              state: {
                domain: this.selectedDomain,
              },
            });
          },
          error: (error) => {
            this.isSaving.set(false);
            console.error('Failed to complete assessment', error);
            this.notifications.danger(
              error.error?.message ||
                'Failed to complete assessment. Please try again.',
              'Complete failed'
            );
          },
        });
    }
  }

  protected cancelAssessment() {
    if (this.hasUnsavedChanges) {
      this.isCancelDialogOpen = true;
      return;
    }
    this.router.navigate(['/dashboard/ai-readiness-assessment']);
  }

  protected get cancelDialogButtons(): DialogButton[] {
    return [
      {
        label: 'Continue editing',
        variant: 'outline',
        action: () => this.closeCancelDialog(),
      },
      {
        label: 'Leave without saving',
        variant: 'danger',
        icon: 'warning',
        action: () => this.confirmCancelAssessment(),
      },
    ];
  }

  protected closeCancelDialog() {
    this.isCancelDialogOpen = false;
  }

  protected confirmCancelAssessment() {
    this.isCancelDialogOpen = false;
    this.router.navigate(['/dashboard/ai-readiness-assessment']);
  }

  protected markAsDirty() {
    this.hasUnsavedChanges = true;
  }

  private loadExistingAssessment(assessmentId: string): void {
    this.assessmentService
      .findOne(assessmentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (apiAssessment: ApiAssessment) => {
          // Patch top-level assessment fields
          this.assessment.id = apiAssessment._id;
          this.assessment.name = apiAssessment.title;
          this.assessment.description = apiAssessment.description || '';
          this.assessment.fullName = apiAssessment.fullName || '';

          if (apiAssessment.domain?._id) {
            this.assessment.domainId = apiAssessment.domain._id;
            this.assessment.domainTitle = apiAssessment.domain.title;

            // Build questions from API response (questions now include full question objects)
            if (apiAssessment.questions && apiAssessment.questions.length > 0) {
              const assessmentQuestions: Question[] = apiAssessment.questions.map(
                (aq) => ({
                  id: aq.question._id,
                  text: aq.question.question,
                  type: aq.question.type || 'text',
                  required: true,
                  answers: aq.question.answers || undefined,
                  min: aq.question.min,
                  max: aq.question.max,
                  answer: this.parseAnswer(aq.answer, aq.question.type),
                  evidenceFiles: undefined,
                })
              );

              // Build assessment domain with questions from API
              const assessmentDomain: AssessmentDomain = {
                id: apiAssessment.domain._id,
                name: apiAssessment.domain.title,
                description: apiAssessment.domain.description || '',
                icon: apiAssessment.domain.icon || 'category',
                completed: false,
                progress: 0,
                questions: assessmentQuestions,
              };

              this.assessment.domains = [assessmentDomain];
              this.calculateProgress();
            } else {
              // If no questions in response, load them from question service
              this.loadQuestionsForDomain(apiAssessment.domain._id);
            }
          }

          this.isLoadingAssessment.set(false);
        },
        error: (error) => {
          console.error('Failed to load assessment', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load assessment details. Please try again.',
            'Assessment load failed'
          );
          this.isLoadingAssessment.set(false);
        },
      });
  }

  private parseAnswer(
    answer: string | string[] | number | undefined,
    questionType?: string
  ): any {
    if (answer === undefined || answer === null) {
      return undefined;
    }

    if (questionType === 'checkbox') {
      if (Array.isArray(answer)) {
        return answer;
      } else if (typeof answer === 'string' && answer) {
        // If it's a comma-separated string, split it
        return answer.split(',').map((a) => a.trim()).filter((a) => a);
      }
      return [];
    } else if (questionType === 'number') {
      if (typeof answer === 'number') {
        return answer;
      } else if (answer !== undefined && answer !== null && answer !== '') {
        return Number(answer);
      }
      return undefined;
    } else {
      // Text and radio are strings
      return answer ?? '';
    }
  }

  private patchAnswersFromAssessment(answers: ApiAssessmentQuestion[]): void {
    if (!this.assessment.domains || this.assessment.domains.length === 0) {
      // Questions not loaded yet; defer applying answers
      this.pendingAnswers = answers;
      return;
    }

    const currentDomain = this.assessment.domains[0];
    const answerMap = new Map<string, string | string[] | number | undefined>();
    answers.forEach((a) => {
      // Handle both old format (question as string ID) and new format (question as object)
      const questionId = typeof a.question === 'string' 
        ? a.question 
        : a.question?._id;
      if (questionId) {
        answerMap.set(questionId, a.answer);
      }
    });

    currentDomain.questions.forEach((q) => {
      if (answerMap.has(q.id)) {
        const answerValue = answerMap.get(q.id);
        // Handle different answer types based on question type
        if (q.type === 'checkbox') {
          // Backend sends checkbox as array, but API might return as string
          if (Array.isArray(answerValue)) {
            q.answer = answerValue;
          } else if (typeof answerValue === 'string' && answerValue) {
            // If it's a comma-separated string, split it
            q.answer = answerValue.split(',').map(a => a.trim()).filter(a => a);
          } else {
            q.answer = [];
          }
        } else if (q.type === 'number') {
          // Backend sends number as number
          if (typeof answerValue === 'number') {
            q.answer = answerValue;
          } else if (answerValue !== undefined && answerValue !== null && answerValue !== '') {
            q.answer = Number(answerValue);
          } else {
            q.answer = undefined;
          }
        } else {
          // Text and radio are strings
          q.answer = answerValue ?? '';
        }
      }
    });

    this.pendingAnswers = null;
    this.calculateProgress();
  }

  private loadQuestionsForDomain(domainId: string): void {
    this.isLoadingQuestions.set(true);
    this.questionService
      .findMany(1, 100, undefined, undefined, undefined, {
        domain: domainId,
        isActive: 'true',
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoadingQuestions.set(false);
          const domain = this.selectedDomain;
          if (!domain) {
            return;
          }

          // Map database questions to assessment questions
          const assessmentQuestions: Question[] = response.data.map(
            (dbQuestion) => ({
              id: dbQuestion._id,
              text: dbQuestion.question,
              type: dbQuestion.type || 'text',
              required: true,
              answers: dbQuestion.answers || undefined,
              min: dbQuestion.min,
              max: dbQuestion.max,
              answer: undefined,
              evidenceFiles: undefined,
            })
          );

          // Build assessment domain with questions from database
          const assessmentDomain: AssessmentDomain = {
            id: domain._id,
            name: domain.title,
            description: domain.description || '',
            icon: domain.icon || 'category',
            completed: false,
            progress: 0,
            questions: assessmentQuestions,
          };

          this.assessment.domains = [assessmentDomain];

          if (this.pendingAnswers && this.pendingAnswers.length > 0) {
            this.patchAnswersFromAssessment(this.pendingAnswers);
          } else {
            this.calculateProgress();
          }
        },
        error: (error) => {
          this.isLoadingQuestions.set(false);
          console.error('Failed to load questions', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load questions for this domain. Please try again.',
            'Questions fetch failed'
          );
          // Fallback to empty domain
          const domain = this.selectedDomain;
          if (domain) {
            const assessmentDomain: AssessmentDomain = {
              id: domain._id,
              name: domain.title,
              description: domain.description || '',
              icon: domain.icon || 'category',
              completed: false,
              progress: 0,
              questions: [],
            };
            this.assessment.domains = [assessmentDomain];
          }
        },
      });
  }

  private buildAssessmentDomain(domain: Domain): AssessmentDomain {
    const templateKey = this.normalizeKey(domain.title);
    const template =
      this.domainTemplates[templateKey] ?? this.domainTemplates['default'];

    return {
      id: domain._id,
      name: domain.title || template.name,
      description: domain.description || template.description,
      icon: domain.icon || template.icon,
      completed: false,
      progress: 0,
      questions: this.cloneQuestions(template.questions),
    };
  }

  private normalizeKey(value?: string): string {
    return value
      ? value
          .toLowerCase()
          .replace(/&/g, 'and')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : '';
  }

  private cloneQuestions(questions: Question[]): Question[] {
    return questions.map((question) => ({
      ...question,
      answer: undefined,
      evidenceFiles: undefined,
    }));
  }
}
