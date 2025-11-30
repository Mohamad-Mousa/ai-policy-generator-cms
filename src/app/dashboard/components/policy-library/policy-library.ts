import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button';
import { TableComponent, TableColumn } from '@shared/components/table/table';
import { DialogComponent } from '@shared/components/dialog/dialog';
import { PolicyService, Policy } from '@shared/services';
import { NotificationService } from '@shared/components/notification/notification.service';
import { PrivilegeAccess } from '@shared/enums';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-policy-library',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonComponent,
    TableComponent,
    DialogComponent,
  ],
  templateUrl: './policy-library.html',
  styleUrl: './policy-library.scss',
})
export class PolicyLibraryComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  protected policies = signal<Policy[]>([]);
  protected isLoading = signal(false);
  protected totalCount = signal(0);
  protected currentPage = signal(1);
  protected pageLimit = signal(10);
  protected searchTerm = signal('');
  protected selectedPolicy = signal<Policy | null>(null);
  protected isLoadingPolicy = signal(false);
  protected viewMode: 'list' | 'detail' = 'list';
  protected expandedAssessmentIndex = signal<number | null>(0);
  protected assessmentPage = signal(1);
  protected assessmentLimit = signal(10);
  protected isDeleteDialogOpen = false;
  protected policyToDelete?: Policy;
  protected deleteDialogLoading = signal(false);

  protected readonly excludedActions: Array<
    'canRead' | 'canWrite' | 'canEdit' | 'canDelete'
  > = ['canWrite', 'canEdit'];
  protected readonly functionKey = 'policies';
  protected readonly deletePrivilege = PrivilegeAccess.D;

  protected readonly tableColumns: TableColumn[] = [
    {
      label: 'Sector',
      key: 'sector',
      sortable: true,
      filterable: false,
    },
    {
      label: 'Organization Size',
      key: 'organizationSize',
      sortable: true,
      filterable: true,
    },
    {
      label: 'Risk Appetite',
      key: 'riskAppetite',
      sortable: true,
      filterable: true,
    },
    {
      label: 'Implementation Timeline',
      key: 'implementationTimeline',
      sortable: true,
      filterable: true,
    },
    {
      label: 'Domains',
      key: 'domainsCount',
      sortable: false,
    },
    {
      label: 'Assessments',
      key: 'assessmentsCount',
      sortable: false,
    },
    {
      label: 'Created At',
      key: 'createdAt',
      sortable: true,
    },
  ];

  constructor(
    private policyService: PolicyService,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadPolicies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected loadPolicies(): void {
    this.isLoading.set(true);

    const filters: Record<string, string> = {};

    this.policyService
      .findMany(
        this.currentPage(),
        this.pageLimit(),
        this.searchTerm() || undefined,
        undefined,
        undefined,
        filters
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.policies.set(response.data);
          this.totalCount.set(response.totalCount);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('Failed to load policies', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load policies. Please try again later.',
            'Policy fetch failed'
          );
        },
      });
  }

  protected onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPolicies();
  }

  protected onLimitChange(limit: number): void {
    this.pageLimit.set(limit);
    this.currentPage.set(1);
    this.loadPolicies();
  }

  protected onSearchChange(search: string): void {
    this.searchTerm.set(search);
    this.currentPage.set(1);
    this.loadPolicies();
  }

  protected onFilterChange(filters: Record<string, string>): void {
    this.currentPage.set(1);
    this.loadPolicies();
  }

  protected get tableRows(): Array<Record<string, unknown>> {
    return this.policies().map((policy) => ({
      _id: policy._id,
      sector: policy.sector || '—',
      organizationSize: policy.organizationSize || '—',
      riskAppetite: policy.riskAppetite || '—',
      implementationTimeline: policy.implementationTimeline || '—',
      domainsCount: `${policy.domains?.length || 0} domain${
        (policy.domains?.length || 0) !== 1 ? 's' : ''
      }`,
      assessmentsCount: (() => {
        if (!policy.assessments) return '0 assessments';
        if (Array.isArray(policy.assessments)) {
          return `${policy.assessments.length} assessment${
            policy.assessments.length !== 1 ? 's' : ''
          }`;
        }
        if (
          typeof policy.assessments === 'object' &&
          'totalCount' in policy.assessments
        ) {
          return `${policy.assessments.totalCount} assessment${
            policy.assessments.totalCount !== 1 ? 's' : ''
          }`;
        }
        return '0 assessments';
      })(),
      createdAt: policy.createdAt
        ? new Date(policy.createdAt).toLocaleDateString()
        : '—',
      policy: policy,
    }));
  }

  protected selectPolicy(policy: Policy) {
    this.viewMode = 'detail';
    this.isLoadingPolicy.set(true);
    this.selectedPolicy.set(null);
    this.expandedAssessmentIndex.set(0);
    this.assessmentPage.set(1);
    this.assessmentLimit.set(10);

    this.loadPolicyDetails(policy._id);
  }

  protected loadPolicyDetails(policyId: string): void {
    this.isLoadingPolicy.set(true);

    this.policyService
      .findOne(policyId, this.assessmentPage(), this.assessmentLimit())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fullPolicy) => {
          this.selectedPolicy.set(fullPolicy);
          this.isLoadingPolicy.set(false);
        },
        error: (error) => {
          this.isLoadingPolicy.set(false);
          console.error('Failed to load policy details', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load policy details. Please try again later.',
            'Policy fetch failed'
          );
          this.backToList();
        },
      });
  }

  protected backToList() {
    this.selectedPolicy.set(null);
    this.viewMode = 'list';
  }

  protected editPolicy(policy: Policy) {
    console.log('Editing policy:', policy._id);
  }

  protected deletePolicy(policy: Policy) {
    this.policyToDelete = policy;
    this.isDeleteDialogOpen = true;
  }

  protected closeDeleteDialog() {
    if (this.deleteDialogLoading()) {
      return;
    }
    this.isDeleteDialogOpen = false;
    this.policyToDelete = undefined;
    this.deleteDialogLoading.set(false);
  }

  protected confirmDelete() {
    if (!this.policyToDelete?._id || this.deleteDialogLoading()) {
      return;
    }

    this.deleteDialogLoading.set(true);
    this.policyService
      .delete(this.policyToDelete._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleteDialogLoading.set(false);
          this.isDeleteDialogOpen = false;
          this.policyToDelete = undefined;
          this.loadPolicies();
          this.notifications.success('Policy deleted successfully.', 'Success');
        },
        error: (error) => {
          this.deleteDialogLoading.set(false);
          console.error('Failed to delete policy', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to delete policy. Please try again later.',
            'Delete failed'
          );
        },
      });
  }

  protected get deleteButtonLabel(): string {
    return this.deleteDialogLoading() ? 'Deleting...' : 'Delete';
  }

  protected exportPolicy(policy: Policy, format: 'pdf' | 'docx') {
    console.log(`Exporting policy ${policy._id} as ${format}`);
  }

  protected viewVersionHistory(policy: Policy) {
    console.log('Viewing version history for:', policy._id);
  }

  protected onRowClick(row: Record<string, unknown>): void {
    const policy = row['policy'] as Policy;
    if (policy) {
      this.selectPolicy(policy);
    }
  }

  protected onDeleteAction(row: Record<string, unknown>): void {
    const policy = row['policy'] as Policy;
    if (policy) {
      this.deletePolicy(policy);
    }
  }

  protected toggleAssessment(index: number): void {
    if (this.expandedAssessmentIndex() === index) {
      this.expandedAssessmentIndex.set(null);
    } else {
      this.expandedAssessmentIndex.set(index);
    }
  }

  protected isAssessmentExpanded(index: number): boolean {
    return this.expandedAssessmentIndex() === index;
  }

  protected onAssessmentPageChange(page: number): void {
    const policy = this.selectedPolicy();
    if (!policy) return;

    this.assessmentPage.set(page);
    this.expandedAssessmentIndex.set(0); // Reset expanded assessment when changing page
    this.loadPolicyDetails(policy._id);
  }

  protected onAssessmentLimitChange(limit: number): void {
    const policy = this.selectedPolicy();
    if (!policy) return;

    this.assessmentLimit.set(limit);
    this.assessmentPage.set(1); // Reset to first page when changing limit
    this.expandedAssessmentIndex.set(0);
    this.loadPolicyDetails(policy._id);
  }

  protected get assessmentsData(): Array<{
    _id: string;
    title: string;
    description?: string;
    fullName?: string;
    status?: string;
    domain?: string;
    questions?: Array<{
      _id?: string;
      question: string;
      answer?: string;
    }>;
  }> {
    const policy = this.selectedPolicy();
    if (!policy || !policy.assessments) return [];

    // Check if assessments is paginated structure
    if (
      typeof policy.assessments === 'object' &&
      'data' in policy.assessments
    ) {
      return policy.assessments.data;
    }

    // Fallback to array structure (for backward compatibility)
    return Array.isArray(policy.assessments) ? policy.assessments : [];
  }

  protected get assessmentsTotalCount(): number {
    const policy = this.selectedPolicy();
    if (!policy || !policy.assessments) return 0;

    // Check if assessments is paginated structure
    if (
      typeof policy.assessments === 'object' &&
      'totalCount' in policy.assessments
    ) {
      return policy.assessments.totalCount;
    }

    // Fallback to array length
    return Array.isArray(policy.assessments) ? policy.assessments.length : 0;
  }

  protected readonly Math = Math;
}
