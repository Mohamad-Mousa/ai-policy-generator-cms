import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button';
import { LoaderComponent } from '@shared/components/loader/loader';
import {
  DialogButton,
  DialogComponent,
} from '@shared/components/dialog/dialog';
import { Assessment as ApiAssessment, Domain } from '@shared/interfaces';
import { AssessmentService } from '@shared/services';
import { NotificationService } from '@shared/components/notification/notification.service';

interface AssessmentDomain {
  id: string;
  name: string;
  description: string;
  icon: string;
  completed: boolean;
  progress: number;
  questions: any[];
}

interface Assessment {
  id: string;
  name: string;
  description?: string;
  fullName?: string;
  createdAt: Date;
  updatedAt?: Date;
  domainId?: string;
  domainTitle?: string;
  status?: string;
  isActive?: boolean;
  overallProgress?: number;
}

interface DomainScore {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'moderate' | 'needs-improvement';
  gaps: string[];
  recommendations: string[];
}

interface OverallReadiness {
  totalScore: number;
  maxScore: number;
  percentage: number;
  level: 'high' | 'medium' | 'low';
  lastUpdated: Date;
}

@Component({
  selector: 'app-readiness-reports',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DialogComponent, LoaderComponent],
  templateUrl: './readiness-reports.html',
  styleUrl: './readiness-reports.scss',
})
export class ReadinessReportsComponent implements OnInit {
  protected overallReadiness: OverallReadiness = {
    totalScore: 0,
    maxScore: 100,
    percentage: 0,
    level: 'low',
    lastUpdated: new Date(),
  };

  protected domainScores: DomainScore[] = [
    {
      id: 'technological-infrastructure',
      name: 'Technological Infrastructure',
      score: 0,
      maxScore: 20,
      status: 'needs-improvement',
      gaps: ['No assessment completed yet'],
      recommendations: [
        'Complete the AI Readiness Assessment to generate recommendations',
      ],
    },
    {
      id: 'data-ecosystem',
      name: 'Data Ecosystem',
      score: 0,
      maxScore: 20,
      status: 'needs-improvement',
      gaps: ['No assessment completed yet'],
      recommendations: [
        'Complete the AI Readiness Assessment to generate recommendations',
      ],
    },
    {
      id: 'human-capital',
      name: 'Human Capital',
      score: 0,
      maxScore: 20,
      status: 'needs-improvement',
      gaps: ['No assessment completed yet'],
      recommendations: [
        'Complete the AI Readiness Assessment to generate recommendations',
      ],
    },
    {
      id: 'government-policy',
      name: 'Government Policy & Regulation',
      score: 0,
      maxScore: 20,
      status: 'needs-improvement',
      gaps: ['No assessment completed yet'],
      recommendations: [
        'Complete the AI Readiness Assessment to generate recommendations',
      ],
    },
    {
      id: 'ai-innovation',
      name: 'AI Innovation & Economic Drivers',
      score: 0,
      maxScore: 20,
      status: 'needs-improvement',
      gaps: ['No assessment completed yet'],
      recommendations: [
        'Complete the AI Readiness Assessment to generate recommendations',
      ],
    },
  ];

  protected selectedDomain: DomainScore | null = null;
  protected viewMode: 'overview' | 'detailed' | 'assessments' = 'overview';
  protected selectedDomainFromState: Domain | null = null;
  protected assessments = signal<Assessment[]>([]);
  protected drafts = signal<Assessment[]>([]);
  protected completed = signal<Assessment[]>([]);
  protected readonly isLoadingAssessments = signal(false);
  protected isDeleteDialogOpen = false;
  protected assessmentToDelete: Assessment | null = null;

  constructor(
    private router: Router,
    private assessmentService: AssessmentService,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    const navigation = this.router.getCurrentNavigation();
    const domainFromState =
      (navigation?.extras?.state?.['domain'] as Domain | undefined) ??
      (history.state?.['domain'] as Domain | undefined);

    if (domainFromState?._id) {
      this.selectedDomainFromState = domainFromState;
      this.viewMode = 'assessments';
      this.loadAssessments(domainFromState._id);
    } else {
      this.loadAllAssessments();
    }
  }

  protected getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      excellent: 'bg-success-subtle text-success-emphasis',
      good: 'bg-info-subtle text-info-emphasis',
      moderate: 'bg-warning-subtle text-warning-emphasis',
      'needs-improvement': 'bg-danger-subtle text-danger-emphasis',
    };
    return classes[status] || classes['needs-improvement'];
  }

  protected getLevelClass(level: string): string {
    const classes: Record<string, string> = {
      high: 'bg-success-subtle text-success-emphasis',
      medium: 'bg-warning-subtle text-warning-emphasis',
      low: 'bg-danger-subtle text-danger-emphasis',
    };
    return classes[level] || classes['low'];
  }

  protected selectDomain(domain: DomainScore) {
    this.selectedDomain = domain;
    this.viewMode = 'detailed';
  }

  protected backToOverview() {
    this.selectedDomain = null;
    this.viewMode = 'overview';
  }

  protected exportReport(format: 'pdf' | 'excel') {
    console.log(`Exporting report as ${format}`);
  }

  protected backToAssessments() {
    this.viewMode = 'assessments';
  }

  protected backToAIReadiness() {
    this.router.navigate(['/dashboard/ai-readiness-assessment']);
  }

  protected viewAssessment(assessment: Assessment) {
    this.router.navigate(['/dashboard/assessment'], {
      state: {
        domain: this.selectedDomainFromState,
        assessmentId: assessment.id,
      },
    });
  }

  protected deleteAssessment(assessment: Assessment, event: Event) {
    event.stopPropagation();
    this.assessmentToDelete = assessment;
    this.isDeleteDialogOpen = true;
  }

  protected closeDeleteDialog() {
    this.isDeleteDialogOpen = false;
    this.assessmentToDelete = null;
  }

  protected confirmDeleteAssessment() {
    if (!this.assessmentToDelete) {
      return;
    }

    this.assessmentService
      .delete(this.assessmentToDelete.id)
      .subscribe({
        next: () => {
          // Reload list for current domain or all
          if (this.selectedDomainFromState?._id) {
            this.loadAssessments(this.selectedDomainFromState._id);
          } else {
            this.loadAllAssessments();
          }
          this.notifications.success(
            'Assessment deleted successfully.',
            'Assessment deleted'
          );
          this.closeDeleteDialog();
        },
        error: (error) => {
          console.error('Failed to delete assessment', error);
          this.notifications.danger(
            error.error?.message ||
              'Failed to delete assessment. Please try again.',
            'Delete failed'
          );
          this.closeDeleteDialog();
        },
      });
  }

  protected get deleteDialogDescription(): string {
    if (!this.assessmentToDelete) {
      return 'Are you sure you want to delete this assessment? This action cannot be undone.';
    }
    return `Are you sure you want to delete "${this.assessmentToDelete.name}"? This action cannot be undone.`;
  }

  protected get deleteDialogButtons(): DialogButton[] {
    return [
      {
        label: 'Cancel',
        variant: 'outline',
        action: () => this.closeDeleteDialog(),
      },
      {
        label: 'Delete',
        variant: 'danger',
        icon: 'delete',
        action: () => this.confirmDeleteAssessment(),
      },
    ];
  }

  protected createNewAssessment() {
    if (this.selectedDomainFromState) {
      this.router.navigate(['/dashboard/assessment'], {
        state: {
          domain: this.selectedDomainFromState,
        },
      });
    }
  }

  private loadAssessments(domainId: string) {
    this.isLoadingAssessments.set(true);
    this.assessmentService
      .findMany(1, 100, undefined, undefined, undefined, {
        domain: domainId,
      })
      .subscribe({
        next: (response) => {
          this.isLoadingAssessments.set(false);
          const mapped = response.data.map((a) => this.mapAssessment(a));
          this.assessments.set(mapped);
          this.drafts.set(
            mapped.filter((a) => (a.status || '').toLowerCase() === 'draft')
          );
          this.completed.set(
            mapped.filter(
              (a) => (a.status || '').toLowerCase() === 'completed'
            )
          );
        },
        error: (error) => {
          this.isLoadingAssessments.set(false);
          console.error('Failed to load assessments', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load assessments for this domain. Please try again.',
            'Assessments fetch failed'
          );
          this.assessments.set([]);
          this.drafts.set([]);
          this.completed.set([]);
        },
      });
  }

  private loadAllAssessments() {
    this.isLoadingAssessments.set(true);
    this.assessmentService
      .findMany(1, 100)
      .subscribe({
        next: (response) => {
          this.isLoadingAssessments.set(false);
          const mapped = response.data.map((a) => this.mapAssessment(a));
          this.assessments.set(mapped);
          this.drafts.set(
            mapped.filter((a) => (a.status || '').toLowerCase() === 'draft')
          );
          this.completed.set(
            mapped.filter(
              (a) => (a.status || '').toLowerCase() === 'completed'
            )
          );
        },
        error: (error) => {
          this.isLoadingAssessments.set(false);
          console.error('Failed to load assessments', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load assessments. Please try again.',
            'Assessments fetch failed'
          );
          this.assessments.set([]);
          this.drafts.set([]);
          this.completed.set([]);
        },
      });
  }

  private mapAssessment(api: ApiAssessment): Assessment {
    // Calculate progress based on answered questions
    const totalQuestions = api.questions?.length || 0;
    const answeredQuestions = api.questions?.filter(
      (q) => q.answer && q.answer.trim() !== ''
    ).length || 0;
    const overallProgress =
      totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    return {
      id: api._id,
      name: api.title,
      description: api.description,
      fullName: api.fullName,
      createdAt: new Date(api.createdAt),
      updatedAt: api.updatedAt ? new Date(api.updatedAt) : undefined,
      domainId: api.domain?._id,
      domainTitle: api.domain?.title,
      status: (api as any).status,
      isActive: api.isActive,
      overallProgress: overallProgress,
    };
  }
}
