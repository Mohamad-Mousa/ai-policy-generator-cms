import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button';
import { Domain } from '@shared/interfaces';
import { NotificationService } from '@shared/components/notification/notification.service';
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
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file';
  required: boolean;
  options?: string[];
  answer?: any;
  evidenceFiles?: File[];
}

interface Assessment {
  id?: string;
  name: string;
  description: string;
  createdAt: Date;
  domains: AssessmentDomain[];
  overallProgress: number;
  domainId: string | null;
  domainTitle?: string;
}

@Component({
  selector: 'app-assessment',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './assessment.html',
  styleUrl: './assessment.scss',
})
export class AssessmentComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  protected assessment: Assessment = {
    name: '',
    description: '',
    createdAt: new Date(),
    domains: [],
    overallProgress: 0,
    domainId: null,
    domainTitle: '',
  };

  protected currentDomainIndex = 0;
  protected currentQuestionIndex = 0;
  protected isSaving = false;
  protected selectedDomain?: Domain;

  protected readonly domainTemplates: AssessmentDomain[] = [
    {
      id: 'technological-infrastructure',
      name: 'Technological Infrastructure',
      description: 'Assess IT infrastructure, cloud capabilities, and technical readiness',
      icon: 'cloud',
      completed: false,
      progress: 0,
      questions: [
        {
          id: 'ti-1',
          text: 'What is your current cloud infrastructure setup?',
          type: 'select',
          required: true,
          options: ['Fully cloud-based', 'Hybrid cloud', 'On-premise', 'Mixed'],
        },
        {
          id: 'ti-2',
          text: 'Describe your current AI/ML infrastructure capabilities',
          type: 'textarea',
          required: true,
        },
        {
          id: 'ti-3',
          text: 'What AI/ML tools and platforms are currently in use?',
          type: 'textarea',
          required: false,
        },
        {
          id: 'ti-4',
          text: 'Upload evidence documents related to infrastructure (optional)',
          type: 'file',
          required: false,
        },
      ],
    },
    {
      id: 'data-ecosystem',
      name: 'Data Ecosystem',
      description: 'Evaluate data quality, governance, and availability',
      icon: 'database',
      completed: false,
      progress: 0,
      questions: [
        {
          id: 'de-1',
          text: 'How would you rate your data quality?',
          type: 'select',
          required: true,
          options: ['Excellent', 'Good', 'Moderate', 'Poor'],
        },
        {
          id: 'de-2',
          text: 'Describe your data governance framework',
          type: 'textarea',
          required: true,
        },
        {
          id: 'de-3',
          text: 'What data sources are available for AI initiatives?',
          type: 'textarea',
          required: false,
        },
        {
          id: 'de-4',
          text: 'Upload data governance documentation (optional)',
          type: 'file',
          required: false,
        },
      ],
    },
    {
      id: 'human-capital',
      name: 'Human Capital',
      description: 'Review workforce skills, training, and AI expertise',
      icon: 'groups',
      completed: false,
      progress: 0,
      questions: [
        {
          id: 'hc-1',
          text: 'How many employees have AI/ML expertise?',
          type: 'select',
          required: true,
          options: ['0-5', '6-20', '21-50', '50+'],
        },
        {
          id: 'hc-2',
          text: 'Describe your AI training and development programs',
          type: 'textarea',
          required: true,
        },
        {
          id: 'hc-3',
          text: 'What recruitment strategies are in place for AI talent?',
          type: 'textarea',
          required: false,
        },
        {
          id: 'hc-4',
          text: 'Upload training documentation or certifications (optional)',
          type: 'file',
          required: false,
        },
      ],
    },
    {
      id: 'government-policy',
      name: 'Government Policy & Regulation',
      description: 'Analyze regulatory framework and policy alignment',
      icon: 'gavel',
      completed: false,
      progress: 0,
      questions: [
        {
          id: 'gp-1',
          text: 'How well-aligned is your organization with current AI regulations?',
          type: 'select',
          required: true,
          options: ['Fully aligned', 'Mostly aligned', 'Partially aligned', 'Not aligned'],
        },
        {
          id: 'gp-2',
          text: 'Describe your compliance framework for AI governance',
          type: 'textarea',
          required: true,
        },
        {
          id: 'gp-3',
          text: 'What regulatory challenges do you face?',
          type: 'textarea',
          required: false,
        },
        {
          id: 'gp-4',
          text: 'Upload compliance documentation (optional)',
          type: 'file',
          required: false,
        },
      ],
    },
    {
      id: 'ai-innovation',
      name: 'AI Innovation & Economic Drivers',
      description: 'Examine innovation ecosystem and economic factors',
      icon: 'trending_up',
      completed: false,
      progress: 0,
      questions: [
        {
          id: 'ai-1',
          text: 'What is your organization\'s AI innovation strategy?',
          type: 'select',
          required: true,
          options: ['Aggressive expansion', 'Moderate growth', 'Cautious exploration', 'No strategy'],
        },
        {
          id: 'ai-2',
          text: 'Describe your AI research and development initiatives',
          type: 'textarea',
          required: true,
        },
        {
          id: 'ai-3',
          text: 'What economic factors drive your AI investments?',
          type: 'textarea',
          required: false,
        },
        {
          id: 'ai-4',
          text: 'Upload innovation strategy documents (optional)',
          type: 'file',
          required: false,
        },
      ],
    },
  ];

  constructor(
    private router: Router,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    const domainFromState =
      (navigation?.extras?.state?.['domain'] as Domain | undefined) ??
      (history.state?.['domain'] as Domain | undefined);

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
    this.assessment.domains = JSON.parse(JSON.stringify(this.domainTemplates));
    this.calculateProgress();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get currentDomain(): AssessmentDomain {
    return this.assessment.domains[this.currentDomainIndex];
  }

  protected get currentQuestion(): Question {
    return this.currentDomain.questions[this.currentQuestionIndex];
  }

  protected get hasPreviousQuestion(): boolean {
    return this.currentQuestionIndex > 0;
  }

  protected get hasNextQuestion(): boolean {
    return this.currentQuestionIndex < this.currentDomain.questions.length - 1;
  }

  protected get hasPreviousDomain(): boolean {
    return this.currentDomainIndex > 0;
  }

  protected get hasNextDomain(): boolean {
    return this.currentDomainIndex < this.assessment.domains.length - 1;
  }

  protected get canCompleteDomain(): boolean {
    return this.currentDomain.questions.every((q) => {
      if (q.required) {
        if (q.type === 'file') {
          return q.evidenceFiles && q.evidenceFiles.length > 0;
        }
        return q.answer !== undefined && q.answer !== null && q.answer !== '';
      }
      return true;
    });
  }

  protected previousQuestion() {
    if (this.hasPreviousQuestion) {
      this.currentQuestionIndex--;
    } else if (this.hasPreviousDomain) {
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
    }
  }

  protected removeFile(question: Question, index: number) {
    if (question.evidenceFiles) {
      question.evidenceFiles.splice(index, 1);
    }
  }

  protected calculateProgress() {
    this.assessment.domains.forEach((domain) => {
      const answeredQuestions = domain.questions.filter((q) => {
        if (q.required) {
          if (q.type === 'file') {
            return q.evidenceFiles && q.evidenceFiles.length > 0;
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
    this.assessment.overallProgress = totalProgress / this.assessment.domains.length;
  }

  protected saveAssessment() {
    this.isSaving = true;
    // TODO: Implement save to backend
    setTimeout(() => {
      this.isSaving = false;
      console.log('Assessment saved:', this.assessment);
    }, 1000);
  }

  protected completeAssessment() {
    if (this.assessment.domains.every((d) => d.completed)) {
      // TODO: Submit assessment to backend for scoring
      console.log('Assessment completed:', this.assessment);
      // Navigate to readiness reports
      this.router.navigate(['/dashboard/readiness-reports']);
    }
  }

  protected cancelAssessment() {
    if (confirm('Are you sure you want to cancel? All unsaved progress will be lost.')) {
      this.router.navigate(['/dashboard/ai-readiness-assessment']);
    }
  }

}

