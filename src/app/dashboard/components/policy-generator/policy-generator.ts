import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button';
import { TableComponent, TableColumn } from '@shared/components/table/table';
import { DialogComponent } from '@shared/components/dialog/dialog';
import { Domain, Assessment } from '@shared/interfaces';
import {
  DomainService,
  AssessmentService,
  PolicyService,
  CreatePolicyRequest,
  Policy,
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
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    TableComponent,
    DialogComponent,
  ],
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
  // Store selected assessment IDs that persist across page changes
  private selectedAssessmentIds = new Set<string>();

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
  protected showAnalysisTypeDialog = signal(false);
  protected selectedAnalysisType: 'quick' | 'detailed' | null = null;
  protected generatedPolicy = signal<Policy | null>(null);

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
    private notifications: NotificationService,
    private router: Router
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

          // Update selected assessments after loading new page
          this.updateSelectedAssessments();

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
    this.selectedAssessmentIds.clear();
    this.selectedAssessments.set([]);
    this.assessments.set([]);
    this.assessmentsTotalCount.set(0);
    this.showAssessmentsView.set(false);
    this.policySections.set([]);
    this.executiveSummary.set('');
    this.isGenerated.set(false);
    this.showPreview.set(false);
    this.isGenerating.set(false);
    this.generatedPolicy.set(null);
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
    this.selectedAssessmentIds.clear();
    this.selectedAssessments.set([]);
  }

  protected onAssessmentSelectionChange(
    selectedRows: Array<Record<string, unknown>>
  ): void {
    // Update the persistent set of selected IDs
    const currentPageIds = new Set(this.assessments().map((a) => a._id));

    // Remove IDs that are no longer selected (from current page)
    currentPageIds.forEach((id) => {
      const isSelected = selectedRows.some((row) => row['_id'] === id);
      if (!isSelected) {
        this.selectedAssessmentIds.delete(id);
      }
    });

    // Add newly selected IDs (from current page)
    selectedRows.forEach((row) => {
      const id = row['_id'] as string;
      if (id) {
        this.selectedAssessmentIds.add(id);
      }
    });

    // Update the selected assessments signal with all selected assessments
    this.updateSelectedAssessments();
  }

  private updateSelectedAssessments(): void {
    // Get all selected assessment IDs
    const selectedIds = Array.from(this.selectedAssessmentIds);

    // We need to get the full assessment data for selected IDs
    // For now, we'll store the IDs and fetch full data when needed
    // Or we can maintain a map of all loaded assessments
    const allSelectedRows: Array<Record<string, unknown>> = [];

    // Check current page assessments
    this.assessments().forEach((assessment) => {
      if (this.selectedAssessmentIds.has(assessment._id)) {
        allSelectedRows.push({
          _id: assessment._id,
          title: assessment.title || '—',
          description: assessment.description || '—',
          fullName: assessment.fullName || '—',
          domainTitle: assessment.domain?.title || '—',
          questionsCount: assessment.questions?.length || 0,
          createdAt: assessment.createdAt
            ? new Date(assessment.createdAt).toLocaleDateString()
            : '—',
        });
      }
    });

    this.selectedAssessments.set(allSelectedRows);
  }

  protected generatePolicy(): void {
    if (this.selectedAssessmentIds.size === 0) {
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

    // Open dialog to select analysis type
    this.selectedAnalysisType = null;
    this.showAnalysisTypeDialog.set(true);
  }

  protected closeAnalysisTypeDialog(): void {
    this.showAnalysisTypeDialog.set(false);
    this.selectedAnalysisType = null;
  }

  protected selectAnalysisType(type: 'quick' | 'detailed'): void {
    this.selectedAnalysisType = type;
  }

  protected confirmAnalysisTypeAndGenerate(): void {
    if (!this.selectedAnalysisType) {
      this.notifications.warning(
        'Please select an analysis type.',
        'Selection Required'
      );
      return;
    }

    // Store the selected analysis type before closing the dialog
    const selectedType = this.selectedAnalysisType;
    this.closeAnalysisTypeDialog();
    this.createPolicyWithAnalysisType(selectedType);
  }

  private createPolicyWithAnalysisType(
    analysisType: 'quick' | 'detailed'
  ): void {
    this.isGenerating.set(true);

    // Prepare policy data using persistent selected IDs
    const policyData: CreatePolicyRequest = {
      domains: this.selectedDomainIds,
      assessments: Array.from(this.selectedAssessmentIds),
      sector: this.policyContext.sector,
      organizationSize: this.policyContext.organizationSize,
      riskAppetite: this.policyContext.riskAppetite,
      implementationTimeline: this.policyContext.timeline,
      analysisType: analysisType,
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

          // Navigate to policy library tab with details
          this.router.navigate(['/dashboard/policy-generator'], {
            queryParams: { policyId: policy._id },
          });
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

  protected get selectedAssessmentIdsForTable(): string[] {
    // Return IDs from current page that are selected
    return this.assessments()
      .filter((assessment) => this.selectedAssessmentIds.has(assessment._id))
      .map((assessment) => assessment._id);
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
