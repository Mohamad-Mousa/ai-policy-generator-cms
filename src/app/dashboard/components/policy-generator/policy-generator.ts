import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/button/button';
import { TableComponent, TableColumn } from '@shared/components/table/table';
import { Domain, Assessment } from '@shared/interfaces';
import {
  DomainService,
  AssessmentService,
  PolicyService,
  CreatePolicyRequest,
} from '@shared/services';
import { NotificationService } from '@shared/components/notification/notification.service';
import { PrivilegeAccess } from '@shared/enums';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PolicyContext {
  sector: string;
  organizationSize: string;
  riskAppetite: string;
  timeline: string;
}

interface PolicySection {
  id: string;
  title: string;
  content: string;
  rationale: string;
  references: string[];
}

@Component({
  selector: 'app-policy-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, TableComponent],
  templateUrl: './policy-generator.html',
  styleUrl: './policy-generator.scss',
})
export class PolicyGeneratorComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  protected policyContext: PolicyContext = {
    sector: '',
    organizationSize: '',
    riskAppetite: '',
    timeline: '',
  };

  protected domains = signal<Domain[]>([]);
  protected selectedDomainIds: string[] = [];
  protected isLoadingDomains = signal(false);

  protected assessments = signal<Assessment[]>([]);
  protected isLoadingAssessments = signal(false);
  protected showAssessmentsView = signal(false);
  protected assessmentsTotalCount = signal(0);
  protected currentPage = signal(1);
  protected pageLimit = signal(10);
  protected selectedAssessments = signal<Array<Record<string, unknown>>>([]);

  protected readonly assessmentTableColumns: TableColumn[] = [
    {
      label: 'Title',
      key: 'title',
      sortable: true,
      filterable: true,
    },
    {
      label: 'Description',
      key: 'description',
      sortable: true,
      filterable: true,
    },
    {
      label: 'Full Name',
      key: 'fullName',
      sortable: true,
      filterable: true,
    },
    {
      label: 'Domain',
      key: 'domainTitle',
      sortable: true,
      filterable: true,
    },
    {
      label: 'Questions',
      key: 'questionsCount',
      sortable: true,
    },
    {
      label: 'Created At',
      key: 'createdAt',
      sortable: true,
    },
  ];

  protected policySections = signal<PolicySection[]>([]);
  protected executiveSummary = signal('');
  protected isGenerating = signal(false);
  protected isGenerated = signal(false);
  protected showPreview = signal(false);

  protected readonly sectorOptions = [
    'Government',
    'Healthcare',
    'Finance',
    'Education',
    'Technology',
    'Manufacturing',
    'Other',
  ];

  protected readonly sizeOptions = [
    'Small (< 50 employees)',
    'Medium (50-500 employees)',
    'Large (500-5000 employees)',
    'Enterprise (> 5000 employees)',
  ];

  protected readonly riskAppetiteOptions = [
    'Conservative',
    'Moderate',
    'Aggressive',
  ];

  protected readonly timelineOptions = [
    'Immediate (0-3 months)',
    'Short-term (3-6 months)',
    'Medium-term (6-12 months)',
    'Long-term (12+ months)',
  ];

  protected readonly selectedDomains = computed(() =>
    this.domains().filter((domain) =>
      this.selectedDomainIds.includes(domain._id)
    )
  );

  protected readonly functionKey = 'policies';
  protected readonly writePrivilege = PrivilegeAccess.W;
  protected readonly readPrivilege = PrivilegeAccess.R;

  constructor(
    private domainService: DomainService,
    private assessmentService: AssessmentService,
    private policyService: PolicyService,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadDomains();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected selectAssessments() {
    if (!this.isFormValid()) {
      return;
    }

    // Reset to first page when selecting assessments
    this.currentPage.set(1);
    this.pageLimit.set(10);
    this.loadAssessments();
  }

  protected loadAssessments(): void {
    this.isLoadingAssessments.set(true);
    this.showAssessmentsView.set(false);

    // Join selected domain IDs with comma for the API
    const domainIds = this.selectedDomainIds.join(',');

    // Fetch completed assessments for selected domains
    this.assessmentService
      .findMany(
        this.currentPage(),
        this.pageLimit(),
        undefined, // No search term
        undefined, // No custom sort
        undefined, // No sort direction
        {
          domain: domainIds,
          status: 'completed',
        }
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.assessments.set(response.data);
          this.assessmentsTotalCount.set(response.totalCount);
          this.isLoadingAssessments.set(false);
          this.showAssessmentsView.set(true);

          if (response.data.length === 0 && this.currentPage() === 1) {
            this.notifications.info(
              'No completed assessments found for the selected domains.',
              'No Assessments'
            );
          }
        },
        error: (error) => {
          this.isLoadingAssessments.set(false);
          console.error('Failed to load assessments', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load assessments. Please try again later.',
            'Assessment fetch failed'
          );
        },
      });
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadAssessments();
  }

  protected onLimitChange(limit: number): void {
    this.pageLimit.set(limit);
    this.currentPage.set(1); // Reset to first page when changing limit
    this.loadAssessments();
  }

  protected isFormValid(): boolean {
    return !!(
      this.selectedDomainIds.length > 0 &&
      this.policyContext.sector &&
      this.policyContext.organizationSize &&
      this.policyContext.riskAppetite &&
      this.policyContext.timeline
    );
  }

  savePolicy() {
    console.log('Saving policy for domains:', this.selectedDomainIds);
  }

  exportPolicy(format: 'pdf' | 'docx') {
    console.log(`Exporting policy as ${format}`);
  }

  protected resetForm() {
    this.policyContext = {
      sector: '',
      organizationSize: '',
      riskAppetite: '',
      timeline: '',
    };
    this.selectedDomainIds = [];
    this.selectedAssessments.set([]);
    this.assessments.set([]);
    this.assessmentsTotalCount.set(0);
    this.showAssessmentsView.set(false);
    this.policySections.set([]);
    this.executiveSummary.set('');
    this.isGenerated.set(false);
    this.showPreview.set(false);
    this.isGenerating.set(false);
    // Reset pagination
    this.currentPage.set(1);
    this.pageLimit.set(10);
  }

  protected toggleDomainSelection(domainId: string): void {
    const index = this.selectedDomainIds.indexOf(domainId);
    if (index > -1) {
      this.selectedDomainIds.splice(index, 1);
    } else {
      this.selectedDomainIds.push(domainId);
    }
  }

  protected isDomainSelected(domainId: string): boolean {
    return this.selectedDomainIds.includes(domainId);
  }

  protected editContext(): void {
    this.showPreview.set(false);
  }

  protected goBackToSelection(): void {
    this.showAssessmentsView.set(false);
    // Reset pagination when going back
    this.currentPage.set(1);
    this.pageLimit.set(10);
    // Clear selections when going back
    this.selectedAssessments.set([]);
  }

  protected onAssessmentSelectionChange(
    selectedRows: Array<Record<string, unknown>>
  ): void {
    this.selectedAssessments.set(selectedRows);
  }

  protected generatePolicy(): void {
    if (this.selectedAssessments().length === 0) {
      this.notifications.warning(
        'Please select at least one assessment to generate a policy.',
        'No Assessments Selected'
      );
      return;
    }

    if (!this.isFormValid()) {
      this.notifications.warning(
        'Please fill in all required fields.',
        'Form Incomplete'
      );
      return;
    }

    this.isGenerating.set(true);

    // Prepare policy data
    const policyData: CreatePolicyRequest = {
      domains: this.selectedDomainIds,
      assessments: this.selectedAssessments().map(
        (row) => row['_id'] as string
      ),
      sector: this.policyContext.sector,
      organizationSize: this.policyContext.organizationSize,
      riskAppetite: this.policyContext.riskAppetite,
      implementationTimeline: this.policyContext.timeline,
    };

    this.policyService
      .create(policyData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (policy) => {
          this.isGenerating.set(false);
          this.notifications.success(
            'Policy generated successfully!',
            'Success'
          );
          console.log('Policy created:', policy);
          // Reset form and return to selection page
          this.resetForm();
        },
        error: (error) => {
          this.isGenerating.set(false);
          console.error('Failed to generate policy', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to generate policy. Please try again later.',
            'Policy Generation Failed'
          );
        },
      });
  }

  protected get assessmentTableRows(): Array<Record<string, unknown>> {
    return this.assessments().map((assessment) => ({
      _id: assessment._id,
      title: assessment.title || '—',
      description: assessment.description || '—',
      fullName: assessment.fullName || '—',
      domainTitle: assessment.domain?.title || '—',
      questionsCount: assessment.questions?.length || 0,
      createdAt: assessment.createdAt
        ? new Date(assessment.createdAt).toLocaleDateString()
        : '—',
    }));
  }

  protected loadDomains(): void {
    this.isLoadingDomains.set(true);
    this.domainService
      .findMany(1, 50, undefined, undefined, undefined, { isActive: 'true' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.domains.set(response.data);
          this.isLoadingDomains.set(false);
        },
        error: (error) => {
          this.isLoadingDomains.set(false);
          console.error('Failed to load domains', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load domains. Please try again later.',
            'Domain fetch failed'
          );
        },
      });
  }
}
