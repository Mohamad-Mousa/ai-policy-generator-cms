import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import {
  TableComponent,
  TableColumn,
} from '@shared/components/table/table';
import { ButtonComponent } from '@shared/components/button/button';
import { DialogComponent } from '@shared/components/dialog/dialog';
import { FormInputComponent } from '@shared/components/form-input/form-input';
import { NotificationService } from '@shared/components/notification/notification.service';
import { DomainService, SubdomainService } from '@shared/services';
import {
  Domain,
  Subdomain,
  CreateSubdomainRequest,
  UpdateSubdomainRequest,
  subdomainDomainId,
  subdomainDomainTitle,
} from '@shared/interfaces';
import { PrivilegeAccess } from '@shared/enums';

@Component({
  selector: 'app-subdomains-cms',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    TableComponent,
    ButtonComponent,
    DialogComponent,
    FormInputComponent,
  ],
  templateUrl: './subdomains-cms.html',
  styleUrl: './subdomains-cms.scss',
})
export class SubdomainsCmsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private domainTitleById = new Map<string, string>();

  protected readonly columns: TableColumn[] = [
    { label: 'Factor', key: 'domainTitle', filterable: false, sortable: false },
    { label: 'Title', key: 'title', filterable: true, sortable: true },
    {
      label: 'Status',
      key: 'isActive',
      type: 'badge',
      badgeClassKey: 'statusClass',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Active', value: 'true' },
        { label: 'Inactive', value: 'false' },
      ],
      sortable: true,
    },
  ];

  protected allDomains = signal<Domain[]>([]);
  protected domainSelectOptions: { label: string; value: string }[] = [];
  protected subdomains = signal<Subdomain[]>([]);
  protected tableRows = signal<Record<string, unknown>[]>([]);
  protected totalCount = signal(0);
  protected tableLoading = signal(false);
  protected domainsLoading = signal(false);
  protected dialogLoading = signal(false);
  protected deleteDialogLoading = signal(false);
  protected domainFilterId = signal('');

  private currentPage = 1;
  private currentLimit = 10;
  private currentSearch = '';
  private currentFilters: Record<string, string> = {};
  protected sortBy?: string;
  protected sortDirection?: 'asc' | 'desc';

  protected readonly excludedActions: Array<
    'canRead' | 'canWrite' | 'canEdit' | 'canDelete'
  > = ['canRead', 'canWrite'];
  protected readonly functionKey = 'domains';
  protected readonly writePrivilege = PrivilegeAccess.W;
  protected readonly deletePrivilege = PrivilegeAccess.D;
  protected readonly PrivilegeAccess = PrivilegeAccess;

  protected isFormDialogOpen = false;
  protected subdomainForm: FormGroup;
  protected selectedSubdomain?: Subdomain;
  protected isDeleteDialogOpen = false;
  protected subdomainToDelete?: Subdomain;

  constructor(
    private fb: FormBuilder,
    private notifications: NotificationService,
    private subdomainService: SubdomainService,
    private domainService: DomainService
  ) {
    this.subdomainForm = this.fb.group({
      domainId: ['', Validators.required],
      title: ['', [Validators.required, Validators.minLength(2)]],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadDomainsForPicker();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get currentPageValue(): number {
    return this.currentPage;
  }

  protected get currentLimitValue(): number {
    return this.currentLimit;
  }

  protected get titleControl(): FormControl {
    return this.subdomainForm.get('title') as FormControl;
  }

  protected get domainIdControl(): FormControl {
    return this.subdomainForm.get('domainId') as FormControl;
  }

  protected get isActiveControl(): FormControl {
    return this.subdomainForm.get('isActive') as FormControl;
  }

  protected get domainSelectOptionsForInput(): {
    label: string;
    value: string | number;
  }[] {
    return this.domainSelectOptions;
  }

  protected get isEditMode(): boolean {
    return !!this.selectedSubdomain;
  }

  protected get formDialogTitle(): string {
    return this.isEditMode ? 'Edit subfactor' : 'Create subfactor';
  }

  protected get formDialogDescription(): string {
    return this.isEditMode
      ? 'Update this subfactor.'
      : 'Choose a parent factor and add a subfactor.';
  }

  protected get formSubmitLabel(): string {
    if (this.dialogLoading()) {
      return this.isEditMode ? 'Saving...' : 'Creating...';
    }
    return this.isEditMode ? 'Save' : 'Create';
  }

  protected get deleteButtonLabel(): string {
    return this.deleteDialogLoading() ? 'Deleting...' : 'Delete';
  }

  private loadDomainsForPicker(): void {
    this.domainsLoading.set(true);
    this.domainService
      .findMany(1, 200, undefined, 'title', 'asc')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.allDomains.set(res.data);
          this.domainTitleById = new Map(
            res.data.map((d) => [d._id, d.title] as const)
          );
          this.domainSelectOptions = res.data.map((d) => ({
            label: d.title,
            value: d._id,
          }));
          this.domainsLoading.set(false);
          this.loadSubdomains(
            1,
            this.currentLimit,
            '',
            this.sortBy,
            this.sortDirection,
            this.currentFilters
          );
        },
        error: (error) => {
          console.error('Error loading domains:', error);
          this.domainsLoading.set(false);
          this.notifications.danger(
            error.error?.message || 'Could not load factors',
            'Failed to load'
          );
          this.loadSubdomains(
            1,
            this.currentLimit,
            '',
            this.sortBy,
            this.sortDirection,
            this.currentFilters
          );
        },
      });
  }

  private loadSubdomains(
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc',
    filters?: Record<string, string>
  ): void {
    this.tableLoading.set(true);
    this.currentPage = page;
    this.currentLimit = limit;
    if (search !== undefined) {
      this.currentSearch = search;
    }
    if (sortBy !== undefined) {
      this.sortBy = sortBy;
    }
    if (sortDirection !== undefined) {
      this.sortDirection = sortDirection;
    }
    if (filters !== undefined) {
      this.currentFilters = filters;
    }

    const merged: Record<string, string> = { ...this.currentFilters };
    const df = this.domainFilterId();
    if (df) {
      merged['domain'] = df;
    }

    this.subdomainService
      .findMany(
        page,
        limit,
        this.currentSearch,
        this.sortBy,
        this.sortDirection,
        merged
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const rows = response.data.map((s) => this.transformForTable(s));
          this.subdomains.set(response.data);
          this.tableRows.set(rows);
          this.totalCount.set(response.totalCount);
          this.tableLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading subdomains:', error);
          this.notifications.danger(
            error.error?.message ||
              'An error occurred while loading subfactors',
            'Failed to load subfactors'
          );
          this.subdomains.set([]);
          this.tableRows.set([]);
          this.totalCount.set(0);
          this.tableLoading.set(false);
        },
      });
  }

  private transformForTable(s: Subdomain): Record<string, unknown> {
    const domainTitle = subdomainDomainTitle(s.domain, this.domainTitleById);
    return {
      ...s,
      domainTitle,
      statusClass: s.isActive ? 'success' : 'warning',
      isActive: s.isActive ? 'Active' : 'Inactive',
    };
  }

  protected onDomainFilterChange(value: string): void {
    this.domainFilterId.set(value);
    this.loadSubdomains(
      1,
      this.currentLimit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onPageChange(page: number): void {
    this.loadSubdomains(
      page,
      this.currentLimit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onLimitChange(limit: number): void {
    this.loadSubdomains(
      1,
      limit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onSearchChange(searchTerm: string): void {
    this.loadSubdomains(
      1,
      this.currentLimit,
      searchTerm,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onFilterChange(filters: Record<string, string>): void {
    this.loadSubdomains(
      1,
      this.currentLimit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      filters
    );
  }

  protected onSortChange(event: {
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  }): void {
    this.loadSubdomains(
      1,
      this.currentLimit,
      this.currentSearch,
      event.sortBy,
      event.sortDirection,
      this.currentFilters
    );
  }

  protected openCreateSubdomain(): void {
    if (!this.domainSelectOptions.length) {
      this.notifications.info(
        'Create a factor first, then add subfactors.',
        'No factors'
      );
      return;
    }
    this.selectedSubdomain = undefined;
    this.isFormDialogOpen = true;
    const defaultDomain =
      this.domainFilterId() || this.domainSelectOptions[0]?.value || '';
    this.subdomainForm.reset({
      domainId: defaultDomain,
      title: '',
      isActive: true,
    });
  }

  protected closeFormDialog(): void {
    if (this.dialogLoading()) {
      return;
    }
    this.isFormDialogOpen = false;
    this.selectedSubdomain = undefined;
    this.dialogLoading.set(false);
    this.subdomainForm.reset({
      domainId: '',
      title: '',
      isActive: true,
    });
  }

  protected onUpdate(row: Record<string, unknown>): void {
    const id = row['_id'] as string;
    const full = this.subdomains().find((s) => s._id === id);
    if (!full) {
      this.notifications.danger(
        'Subfactor not found',
        'Could not load subfactor for editing'
      );
      return;
    }
    this.selectedSubdomain = full;
    this.isFormDialogOpen = true;
    this.subdomainForm.patchValue({
      domainId: subdomainDomainId(full.domain),
      title: full.title,
      isActive: full.isActive,
    });
  }

  protected onDelete(row: Record<string, unknown>): void {
    const id = row['_id'] as string;
    const full = this.subdomains().find((s) => s._id === id);
    if (!full) {
      this.notifications.danger(
        'Subfactor not found',
        'Could not find subfactor to delete'
      );
      return;
    }
    this.subdomainToDelete = full;
    this.isDeleteDialogOpen = true;
  }

  protected closeDeleteDialog(): void {
    if (this.deleteDialogLoading()) {
      return;
    }
    this.isDeleteDialogOpen = false;
    this.subdomainToDelete = undefined;
    this.deleteDialogLoading.set(false);
  }

  protected onSubmitForm(): void {
    if (this.subdomainForm.invalid || this.dialogLoading()) {
      this.subdomainForm.markAllAsTouched();
      return;
    }

    const domainId = this.subdomainForm.value.domainId as string;
    if (!domainId) {
      return;
    }

    this.dialogLoading.set(true);
    const { title, isActive } = this.subdomainForm.value;

    if (this.isEditMode && this.selectedSubdomain?._id) {
      const body: UpdateSubdomainRequest = {
        _id: this.selectedSubdomain._id,
        title,
        domain: domainId,
        isActive: !!isActive,
      };
      this.subdomainService
        .update(body)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.dialogLoading.set(false);
            this.closeFormDialog();
            this.reloadCurrentPage();
            this.notifications.success(
              'Subfactor updated',
              `${title} has been updated`
            );
          },
          error: (error) => {
            console.error('Error updating subdomain:', error);
            this.dialogLoading.set(false);
            this.notifications.danger(
              error.error?.message || 'Unable to update subfactor',
              'Update failed'
            );
          },
        });
      return;
    }

    const body: CreateSubdomainRequest = {
      title,
      domain: domainId,
      isActive: isActive !== false,
    };

    this.subdomainService
      .create(body)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.dialogLoading.set(false);
          this.closeFormDialog();
          this.reloadCurrentPage();
          this.notifications.success(
            'Subfactor created',
            `${title} has been added`
          );
        },
        error: (error) => {
          console.error('Error creating subdomain:', error);
          this.dialogLoading.set(false);
          this.notifications.danger(
            error.error?.message || 'Unable to create subfactor',
            'Create failed'
          );
        },
      });
  }

  private reloadCurrentPage(): void {
    this.loadSubdomains(
      this.currentPage,
      this.currentLimit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected confirmDelete(): void {
    if (!this.subdomainToDelete?._id || this.deleteDialogLoading()) {
      return;
    }

    this.deleteDialogLoading.set(true);
    this.tableLoading.set(true);
    this.subdomainService
      .delete(this.subdomainToDelete._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const deletedTitle = this.subdomainToDelete?.title;
          this.deleteDialogLoading.set(false);
          this.closeDeleteDialog();
          this.reloadCurrentPage();
          this.notifications.success(
            'Subfactor deleted',
            `${deletedTitle ?? 'Subfactor'} has been removed`
          );
          this.tableLoading.set(false);
        },
        error: (error) => {
          console.error('Error deleting subdomain:', error);
          this.deleteDialogLoading.set(false);
          this.tableLoading.set(false);
          this.notifications.danger(
            error.error?.message || 'Unable to delete subfactor',
            'Delete failed'
          );
        },
      });
  }
}
