import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
} from '../../../shared/components/table/table';
import { ButtonComponent } from '../../../shared/components/button/button';
import { DialogComponent } from '../../../shared/components/dialog/dialog';
import { NotificationService } from '../../../shared/components/notification/notification.service';
import {
  SidebarComponent,
  SidebarField,
} from '../../../shared/components/sidebar/sidebar';
import { DomainService } from '../../../shared/services';
import {
  Domain,
  CreateDomainRequest,
  UpdateDomainRequest,
} from '../../../shared/interfaces';
import { PrivilegeAccess } from '../../../shared/enums';
import { FormInputComponent } from '../../../shared/components/form-input/form-input';

@Component({
  selector: 'app-domains-section',
  standalone: true,
  imports: [
    CommonModule,
    TableComponent,
    ButtonComponent,
    DialogComponent,
    ReactiveFormsModule,
    SidebarComponent,
    FormInputComponent,
  ],
  templateUrl: './domains.html',
  styleUrl: './domains.scss',
})
export class DomainsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  protected readonly columns: TableColumn[] = [
    {
      label: 'Icon',
      key: 'icon',
      type: 'icon',
      filterable: true,
      sortable: true,
    },
    { label: 'Title', key: 'title', filterable: true, sortable: true },
    {
      label: 'Description',
      key: 'description',
      filterable: true,
      sortable: true,
    },
    {
      label: 'Subdomains',
      key: 'subDomains',
      type: 'tags',
      filterable: false,
      sortable: false,
    },
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

  protected domains = signal<Domain[]>([]);
  protected tableRows = signal<Record<string, unknown>[]>([]);
  protected totalCount = signal(0);
  protected tableLoading = signal(false);
  protected dialogLoading = signal(false);
  protected deleteDialogLoading = signal(false);
  private currentPage = 1;
  private currentLimit = 10;
  private currentSearch = '';
  private currentFilters: Record<string, string> = {};
  protected sortBy?: string;
  protected sortDirection?: 'asc' | 'desc';

  protected get currentPageValue(): number {
    return this.currentPage;
  }

  protected get currentLimitValue(): number {
    return this.currentLimit;
  }

  protected readonly excludedActions: Array<
    'canRead' | 'canWrite' | 'canEdit' | 'canDelete'
  > = ['canWrite'];
  protected readonly functionKey = 'domains';
  protected readonly writePrivilege = PrivilegeAccess.W;
  protected readonly deletePrivilege = PrivilegeAccess.D;
  protected readonly PrivilegeAccess = PrivilegeAccess;

  protected isDialogOpen = false;
  protected domainForm: FormGroup;
  protected selectedDomain?: Domain;
  protected isDeleteDialogOpen = false;
  protected domainToDelete?: Domain;
  protected isSidebarOpen = false;
  protected sidebarDomain?: Domain;

  constructor(
    private fb: FormBuilder,
    private notifications: NotificationService,
    private domainService: DomainService
  ) {
    this.domainForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(3)]],
      icon: [''],
      subDomains: this.fb.nonNullable.control<string[]>([]),
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.tableLoading.set(false);
    this.loadDomains(
      this.currentPage,
      this.currentLimit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDomains(
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

    this.domainService
      .findMany(
        page,
        limit,
        this.currentSearch,
        this.sortBy,
        this.sortDirection,
        this.currentFilters
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const transformedDomains = response.data.map((domain) =>
            this.transformDomainForTable(domain)
          );
          this.domains.set(response.data);
          this.tableRows.set(transformedDomains);
          this.totalCount.set(response.totalCount);
          this.tableLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading domains:', error);
          this.notifications.danger(
            error.error?.message || 'An error occurred while loading domains',
            'Failed to load domains'
          );
          this.domains.set([]);
          this.tableRows.set([]);
          this.totalCount.set(0);
          this.tableLoading.set(false);
        },
      });
  }

  protected transformDomainForTable(domain: Domain): Record<string, unknown> {
    return {
      ...domain,
      statusClass: domain.isActive ? 'success' : 'warning',
      isActive: domain.isActive ? 'Active' : 'Inactive',
      icon: domain.icon || '',
      subDomains: domain.subDomains ?? [],
    };
  }

  protected onPageChange(page: number): void {
    this.loadDomains(
      page,
      this.currentLimit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onLimitChange(limit: number): void {
    this.loadDomains(
      1,
      limit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onSearchChange(searchTerm: string): void {
    this.loadDomains(
      1,
      this.currentLimit,
      searchTerm,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onFilterChange(filters: Record<string, string>): void {
    this.loadDomains(
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
    this.loadDomains(
      1,
      this.currentLimit,
      this.currentSearch,
      event.sortBy,
      event.sortDirection,
      this.currentFilters
    );
  }

  protected get isEditMode(): boolean {
    return !!this.selectedDomain;
  }

  protected get titleControl(): FormControl {
    return this.domainForm.get('title') as FormControl;
  }

  protected get descriptionControl(): FormControl {
    return this.domainForm.get('description') as FormControl;
  }

  protected get subDomainsControl(): FormControl<string[]> {
    return this.domainForm.get('subDomains') as FormControl<string[]>;
  }

  protected get iconControl(): FormControl {
    return this.domainForm.get('icon') as FormControl;
  }

  protected get isActiveControl(): FormControl {
    return this.domainForm.get('isActive') as FormControl;
  }

  protected get dialogTitle(): string {
    return this.isEditMode ? 'Edit domain' : 'Create domain';
  }

  protected get dialogDescription(): string {
    return this.isEditMode
      ? 'Update domain information.'
      : 'Add a new domain to the system.';
  }

  protected get createButtonLabel(): string {
    if (this.dialogLoading()) {
      return this.isEditMode ? 'Updating...' : 'Creating...';
    }
    return this.isEditMode ? 'Update domain' : 'Create domain';
  }

  protected get deleteButtonLabel(): string {
    return this.deleteDialogLoading() ? 'Deleting...' : 'Delete';
  }

  protected openCreateDomainDialog() {
    this.selectedDomain = undefined;
    this.isDialogOpen = true;
    this.resetForm();
  }

  protected closeDialog() {
    if (this.dialogLoading()) {
      return;
    }
    this.isDialogOpen = false;
    this.selectedDomain = undefined;
    this.dialogLoading.set(false);
    this.resetForm();
  }

  private resetForm() {
    this.domainForm.reset({
      title: '',
      description: '',
      icon: '',
      subDomains: [],
      isActive: true,
    });
  }

  protected onSubmit() {
    this.domainForm.markAllAsTouched();
    if (this.domainForm.invalid || this.dialogLoading()) {
      return;
    }

    this.dialogLoading.set(true);
    this.tableLoading.set(true);
    const formValue = this.domainForm.value;
    const sanitizedSubDomains = Array.isArray(formValue.subDomains)
      ? (formValue.subDomains as Array<string | null | undefined>)
          .map((subDomain) => subDomain?.trim())
          .filter((subDomain): subDomain is string => !!subDomain)
      : [];

    const domainData: CreateDomainRequest | UpdateDomainRequest = {
      title: formValue.title,
      description: formValue.description,
      ...(formValue.icon &&
        formValue.icon.trim() && { icon: formValue.icon.trim() }),
      ...(formValue.isActive !== undefined && {
        isActive: formValue.isActive ? 'true' : 'false',
      }),
      subDomains: sanitizedSubDomains,
    };

    if (this.isEditMode && this.selectedDomain?._id) {
      (domainData as UpdateDomainRequest)._id = this.selectedDomain._id;
    }

    const operation = this.isEditMode
      ? this.domainService.update(domainData as UpdateDomainRequest)
      : this.domainService.create(domainData as CreateDomainRequest);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (domain) => {
        const wasEditMode = this.isEditMode;
        this.dialogLoading.set(false);
        this.closeDialog();
        this.loadDomains(
          this.currentPage,
          this.currentLimit,
          this.currentSearch,
          this.sortBy,
          this.sortDirection,
          this.currentFilters
        );

        this.notifications.success(
          wasEditMode ? 'Domain updated' : 'Domain created',
          `${domain.title} has been ${
            wasEditMode ? 'updated' : 'added'
          } successfully`
        );
      },
      error: (error) => {
        console.error(
          `Error ${this.isEditMode ? 'updating' : 'creating'} domain:`,
          error
        );
        this.dialogLoading.set(false);
        this.notifications.danger(
          error.error?.message ||
            `An error occurred while ${
              this.isEditMode ? 'updating' : 'creating'
            } the domain`,
          `Failed to ${this.isEditMode ? 'update' : 'create'} domain`
        );
        this.tableLoading.set(false);
      },
    });
  }

  protected onRead(domain: Record<string, unknown>): void {
    const domainId = domain['_id'] as string;
    const fullDomain = this.domains().find((d) => d._id === domainId);

    if (!fullDomain) {
      this.notifications.danger(
        'Domain not found',
        'Could not load domain details'
      );
      return;
    }

    this.sidebarDomain = fullDomain;
    this.isSidebarOpen = true;
  }

  protected closeSidebar(): void {
    this.isSidebarOpen = false;
    this.sidebarDomain = undefined;
  }

  protected get sidebarFields(): SidebarField[] {
    if (!this.sidebarDomain) return [];
    return [
      {
        label: 'Title',
        key: 'title',
        type: 'text',
      },
      {
        label: 'Description',
        key: 'description',
        type: 'text',
      },
      {
        label: 'Status',
        key: 'isActive',
        type: 'badge',
        badgeClassKey: 'statusClass',
        format: () => (this.sidebarDomain?.isActive ? 'Active' : 'Inactive'),
      },
      {
        label: 'Icon',
        key: 'icon',
        type: 'icon',
      },
      {
        label: 'Subdomains',
        key: 'subDomains',
        type: 'text',
        format: (value) =>
          Array.isArray(value) && value.length ? value.join(', ') : '—',
      },
      {
        label: 'Created At',
        key: 'createdAt',
        type: 'date',
      },
      {
        label: 'Updated At',
        key: 'updatedAt',
        type: 'date',
      },
    ];
  }

  protected get sidebarData(): Record<string, unknown> {
    if (!this.sidebarDomain) return {};
    return {
      ...this.sidebarDomain,
      statusClass: this.sidebarDomain.isActive ? 'success' : 'warning',
      isActive: this.sidebarDomain.isActive ? 'Active' : 'Inactive',
      icon: this.sidebarDomain.icon || '',
      subDomains: this.sidebarDomain.subDomains ?? [],
    };
  }

  protected onUpdate(domain: Record<string, unknown>): void {
    const domainId = domain['_id'] as string;
    const fullDomain = this.domains().find((d) => d._id === domainId);

    if (!fullDomain) {
      this.notifications.danger(
        'Domain not found',
        'Could not load domain details for editing'
      );
      return;
    }

    this.selectedDomain = fullDomain;
    this.isDialogOpen = true;

    this.domainForm.patchValue({
      title: fullDomain.title,
      description: fullDomain.description,
      icon: fullDomain.icon || '',
      subDomains: [...(fullDomain.subDomains ?? [])],
      isActive: fullDomain.isActive,
    });
  }

  protected onDelete(domain: Record<string, unknown>): void {
    const domainId = domain['_id'] as string;
    const fullDomain = this.domains().find((d) => d._id === domainId);

    if (!fullDomain) {
      this.notifications.danger(
        'Domain not found',
        'Could not find domain to delete'
      );
      return;
    }

    this.domainToDelete = fullDomain;
    this.isDeleteDialogOpen = true;
  }

  protected closeDeleteDialog() {
    if (this.deleteDialogLoading()) {
      return;
    }
    this.isDeleteDialogOpen = false;
    this.domainToDelete = undefined;
    this.deleteDialogLoading.set(false);
  }

  protected confirmDelete() {
    if (!this.domainToDelete?._id || this.deleteDialogLoading()) {
      return;
    }

    this.deleteDialogLoading.set(true);
    this.tableLoading.set(true);
    this.domainService
      .delete(this.domainToDelete._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleteDialogLoading.set(false);
          this.closeDeleteDialog();
          this.loadDomains(
            this.currentPage,
            this.currentLimit,
            this.currentSearch,
            this.sortBy,
            this.sortDirection,
            this.currentFilters
          );

          this.notifications.success(
            'Domain deleted',
            `${this.domainToDelete?.title} has been deleted successfully`
          );
        },
        error: (error) => {
          console.error('Error deleting domain:', error);
          this.deleteDialogLoading.set(false);
          this.notifications.danger(
            error.error?.message ||
              'An error occurred while deleting the domain',
            'Failed to delete domain'
          );
          this.tableLoading.set(false);
        },
      });
  }
}
