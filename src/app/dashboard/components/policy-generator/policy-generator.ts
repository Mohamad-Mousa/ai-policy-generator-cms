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
  CountryService,
  InitiativeService,
  CreatePolicyRequest,
  Policy,
} from '@shared/services';
import { Country, Initiative } from '@shared/interfaces';
import { NotificationService } from '@shared/components/notification/notification.service';
import { PrivilegeAccess } from '@shared/enums';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

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

export type PolicySource = 'assessments' | 'verified' | null;

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

  /** Source selection: null = show selection screen, 'assessments' = my assessments flow, 'verified' = verified policies flow */
  protected policySource = signal<PolicySource>(null);
  protected countries = signal<Country[]>([]);
  protected countriesTotalCount = signal(0);
  protected countriesPage = signal(1);
  protected readonly countriesPageSize = 50;
  protected isLoadingCountries = signal(false);
  protected isLoadingMoreCountries = signal(false);
  protected selectedCountryId: string | null = null;
  protected selectedCountry = signal<Country | null>(null);
  protected countryPickerOpen = signal(true);
  protected countrySearchTerm = '';
  private countrySearchSubject = new Subject<string>();

  /** Initiatives (policies) for selected country in verified flow */
  protected initiatives = signal<Initiative[]>([]);
  protected initiativesTotalCount = signal(0);
  protected initiativesPage = signal(1);
  protected initiativesPageLimit = signal(10);
  protected isLoadingInitiatives = signal(false);
  private selectedInitiativeIds = new Set<string>();
  protected selectedInitiatives = signal<Array<Record<string, unknown>>>([]);
  /** Total count of selected initiatives across all pages (for header display) */
  protected selectedInitiativeTotalCount = signal(0);

  protected readonly initiativeTableColumns: TableColumn[] = [
    { label: 'Name', key: 'englishName', sortable: true, filterable: true },
    { label: 'Description', key: 'description', sortable: true, filterable: true },
    { label: 'Category', key: 'category', sortable: true, filterable: true },
    { label: 'Status', key: 'status', sortable: true, filterable: true },
    { label: 'Type', key: 'initiativeTypeName', sortable: true, filterable: true },
    { label: 'Responsible Organisation', key: 'responsibleOrganisation', sortable: true, filterable: true },
    { label: 'Created At', key: 'createdAt', sortable: true },
  ];

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
  /** Which flow opened the analysis type dialog: assessments vs initiatives (different APIs) */
  private generationSource: 'assessments' | 'verified' | null = null;

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

  protected readonly hasMoreCountries = computed(
    () => this.countries().length < this.countriesTotalCount()
  );

  protected readonly functionKey = 'policies';
  protected readonly writePrivilege = PrivilegeAccess.W;
  protected readonly readPrivilege = PrivilegeAccess.R;

  constructor(
    private domainService: DomainService,
    private assessmentService: AssessmentService,
    private policyService: PolicyService,
    private countryService: CountryService,
    private initiativeService: InitiativeService,
    private notifications: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Domains and countries load when user selects the corresponding source
    this.countrySearchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => {
        this.countrySearchTerm = term;
        this.countriesPage.set(1);
        this.loadCountries(term);
      });
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

    this.generationSource = 'assessments';
    this.selectedAnalysisType = null;
    this.showAnalysisTypeDialog.set(true);
  }

  protected generatePolicyFromInitiatives(): void {
    if (this.selectedInitiativeIds.size === 0) {
      this.notifications.warning(
        'Please select at least one initiative to generate a policy.',
        'No Initiatives Selected'
      );
      return;
    }
    const country = this.selectedCountry();
    if (!country) {
      return;
    }
    this.generationSource = 'verified';
    this.selectedAnalysisType = null;
    this.showAnalysisTypeDialog.set(true);
  }

  protected closeAnalysisTypeDialog(): void {
    this.showAnalysisTypeDialog.set(false);
    this.selectedAnalysisType = null;
    this.generationSource = null;
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

    const selectedType = this.selectedAnalysisType;
    const source = this.generationSource;
    this.closeAnalysisTypeDialog();

    if (source === 'verified') {
      this.createPolicyFromInitiativesWithAnalysisType(selectedType);
    } else {
      this.createPolicyWithAnalysisType(selectedType);
    }
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

  protected showSourceSelection(): boolean {
    return this.policySource() === null;
  }

  protected selectSource(source: 'assessments' | 'verified'): void {
    this.policySource.set(source);
    if (source === 'assessments') {
      this.loadDomains();
    } else if (source === 'verified') {
      this.loadCountries();
    }
  }

  protected goBackToSourceSelection(): void {
    this.policySource.set(null);
    this.selectedCountryId = null;
    this.selectedCountry.set(null);
    this.countryPickerOpen.set(true);
    this.countrySearchTerm = '';
    this.countriesPage.set(1);
    this.initiatives.set([]);
    this.initiativesTotalCount.set(0);
    this.initiativesPage.set(1);
    this.selectedInitiativeIds.clear();
    this.selectedInitiatives.set([]);
    this.selectedInitiativeTotalCount.set(0);
    this.resetForm();
  }

  protected loadInitiatives(): void {
    const country = this.selectedCountry();
    if (!country) {
      return;
    }
    this.isLoadingInitiatives.set(true);
    const countryValue = String(country.value);
    this.initiativeService
      .findMany({
        page: this.initiativesPage(),
        limit: this.initiativesPageLimit(),
        term: undefined,
        status: '',
        category: '',
        gaiinCountryId: countryValue,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.initiatives.set(response.data);
          this.initiativesTotalCount.set(response.totalCount);
          this.isLoadingInitiatives.set(false);
          this.updateSelectedInitiatives();
        },
        error: (error) => {
          this.isLoadingInitiatives.set(false);
          console.error('Failed to load initiatives', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load policies. Please try again later.',
            'Policies fetch failed'
          );
        },
      });
  }

  protected onInitiativesPageChange(page: number): void {
    if (page === this.initiativesPage()) {
      return;
    }
    this.initiativesPage.set(page);
    this.loadInitiatives();
  }

  protected onInitiativesLimitChange(limit: number): void {
    this.initiativesPageLimit.set(limit);
    this.initiativesPage.set(1);
    this.loadInitiatives();
  }

  protected onInitiativeSelectionChange(
    selectedRows: Array<Record<string, unknown>>
  ): void {
    const currentPageIds = new Set(this.initiatives().map((i) => i._id));
    currentPageIds.forEach((id) => {
      const isSelected = selectedRows.some((row) => row['_id'] === id);
      if (!isSelected) {
        this.selectedInitiativeIds.delete(id);
      }
    });
    selectedRows.forEach((row) => {
      const id = row['_id'] as string;
      if (id) {
        this.selectedInitiativeIds.add(id);
      }
    });
    this.updateSelectedInitiatives();
    this.selectedInitiativeTotalCount.set(this.selectedInitiativeIds.size);
  }

  private updateSelectedInitiatives(): void {
    const allSelectedRows: Array<Record<string, unknown>> = [];
    this.initiatives().forEach((initiative) => {
      if (this.selectedInitiativeIds.has(initiative._id)) {
        allSelectedRows.push({
          _id: initiative._id,
          englishName: initiative.englishName ?? '—',
          description: initiative.description ?? '—',
          category: initiative.category ?? '—',
          status: initiative.status ?? '—',
          initiativeTypeName: initiative.initiativeType?.name ?? '—',
          responsibleOrganisation: initiative.responsibleOrganisation ?? '—',
          createdAt: initiative.createdAt
            ? new Date(initiative.createdAt).toLocaleDateString()
            : '—',
        });
      }
    });
    this.selectedInitiatives.set(allSelectedRows);
  }

  protected get initiativeTableRows(): Array<Record<string, unknown>> {
    return this.initiatives().map((initiative) => ({
      _id: initiative._id,
      englishName: initiative.englishName ?? '—',
      description: initiative.description ?? '—',
      category: initiative.category ?? '—',
      status: initiative.status ?? '—',
      initiativeTypeName: initiative.initiativeType?.name ?? '—',
      responsibleOrganisation: initiative.responsibleOrganisation ?? '—',
      createdAt: initiative.createdAt
        ? new Date(initiative.createdAt).toLocaleDateString()
        : '—',
    }));
  }

  protected get selectedInitiativeIdsForTable(): string[] {
    return this.initiatives()
      .filter((initiative) => this.selectedInitiativeIds.has(initiative._id))
      .map((initiative) => initiative._id);
  }

  protected onInitiativeView(row: Record<string, unknown>): void {
    const id = row['_id'] as string;
    if (id) {
      this.router.navigate(['/dashboard/initiative', id]);
    }
  }

  private createPolicyFromInitiativesWithAnalysisType(
    analysisType: 'quick' | 'detailed'
  ): void {
    const country = this.selectedCountry();
    if (!country) {
      this.notifications.danger(
        'Country selection is missing.',
        'Error'
      );
      return;
    }
    this.isGenerating.set(true);
    const request = {
      initiativeIds: Array.from(this.selectedInitiativeIds),
      countryValue: country.value,
      analysisType,
    };
    this.policyService
      .createFromInitiatives(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (policy) => {
          this.isGenerating.set(false);
          this.notifications.success(
            'Policy generated successfully!',
            'Success'
          );
          this.router.navigate(['/dashboard/policy-generator'], {
            queryParams: { policyId: policy._id },
          });
        },
        error: (error) => {
          this.isGenerating.set(false);
          console.error('Failed to generate policy from initiatives', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to generate policy. Please try again later.',
            'Policy Generation Failed'
          );
        },
      });
  }

  protected openCountryPicker(): void {
    this.countryPickerOpen.set(true);
  }

  protected onCountrySearchInput(term: string): void {
    this.countrySearchSubject.next(term ?? '');
  }

  protected loadCountries(search?: string): void {
    this.isLoadingCountries.set(true);
    this.countriesPage.set(1);
    this.countryService
      .findMany(1, this.countriesPageSize, search?.trim() || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.countries.set(response.data);
          this.countriesTotalCount.set(response.totalCount);
          this.countriesPage.set(1);
          this.isLoadingCountries.set(false);
        },
        error: (error) => {
          this.isLoadingCountries.set(false);
          console.error('Failed to load countries', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load countries. Please try again later.',
            'Country fetch failed'
          );
        },
      });
  }

  protected loadMoreCountries(): void {
    if (
      !this.hasMoreCountries() ||
      this.isLoadingMoreCountries() ||
      this.isLoadingCountries()
    ) {
      return;
    }
    const nextPage = this.countriesPage() + 1;
    this.isLoadingMoreCountries.set(true);
    this.countryService
      .findMany(
        nextPage,
        this.countriesPageSize,
        this.countrySearchTerm?.trim() || undefined
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.countries.update((prev) => [...prev, ...response.data]);
          this.countriesPage.set(nextPage);
          this.isLoadingMoreCountries.set(false);
        },
        error: (error) => {
          this.isLoadingMoreCountries.set(false);
          console.error('Failed to load more countries', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load more countries. Please try again later.',
            'Load more failed'
          );
        },
      });
  }

  protected onCountryListScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (!el || !this.hasMoreCountries() || this.isLoadingMoreCountries()) {
      return;
    }
    const threshold = 80;
    const atBottom =
      el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
    if (atBottom) {
      this.loadMoreCountries();
    }
  }

  protected selectCountry(countryId: string): void {
    if (this.selectedCountryId === countryId) {
      this.selectedCountryId = null;
      this.selectedCountry.set(null);
      this.countryPickerOpen.set(true);
      this.initiatives.set([]);
      this.initiativesTotalCount.set(0);
      this.selectedInitiativeIds.clear();
      this.selectedInitiatives.set([]);
      return;
    }
    const country = this.countries().find((c) => c._id === countryId);
    if (country) {
      this.selectedCountry.set(country);
      this.selectedCountryId = countryId;
      this.countryPickerOpen.set(false);
      this.initiativesPage.set(1);
      this.selectedInitiativeIds.clear();
      this.selectedInitiatives.set([]);
      this.selectedInitiativeTotalCount.set(0);
      this.loadInitiatives();
    }
  }

  protected getInitiativeTitle(initiative: Initiative): string {
    return initiative.englishName ?? initiative.description?.slice(0, 80) ?? '—';
  }

  protected getInitiativesTotalPages(): number {
    const total = this.initiativesTotalCount();
    const size = this.initiativesPageLimit();
    return total <= 0 ? 1 : Math.ceil(total / size);
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
