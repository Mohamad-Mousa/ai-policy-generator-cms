import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button';
import {
  DialogButton,
  DialogComponent,
} from '@shared/components/dialog/dialog';
import { Domain } from '@shared/interfaces';

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
  description: string;
  createdAt: Date;
  updatedAt?: Date;
  domainId: string;
  domainTitle?: string;
  overallProgress: number;
  isCompleted: boolean;
  domains?: AssessmentDomain[];
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
  imports: [CommonModule, ButtonComponent, DialogComponent],
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
  protected isDeleteDialogOpen = false;
  protected assessmentToDelete: Assessment | null = null;

  constructor(private router: Router) {}

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

    const stored = localStorage.getItem('assessments');
    if (stored) {
      const assessments: Assessment[] = JSON.parse(stored);
      const filtered = assessments.filter(
        (a) => a.id !== this.assessmentToDelete!.id
      );
      localStorage.setItem('assessments', JSON.stringify(filtered));
      this.loadAssessments(this.assessmentToDelete.domainId);
    }

    this.closeDeleteDialog();
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
    const stored = localStorage.getItem('assessments');
    if (stored) {
      const allAssessments: Assessment[] = JSON.parse(stored);
      const filtered = allAssessments.filter((a) => a.domainId === domainId);
      this.assessments.set(filtered);
      this.drafts.set(filtered.filter((a) => !a.isCompleted));
      this.completed.set(filtered.filter((a) => a.isCompleted));
    } else {
      this.assessments.set([]);
      this.drafts.set([]);
      this.completed.set([]);
    }
  }

  private loadAllAssessments() {
    const stored = localStorage.getItem('assessments');
    if (stored) {
      const allAssessments: Assessment[] = JSON.parse(stored);
      this.assessments.set(allAssessments);
      this.drafts.set(allAssessments.filter((a) => !a.isCompleted));
      this.completed.set(allAssessments.filter((a) => a.isCompleted));
    }
  }
}
