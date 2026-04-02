import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  signal,
} from '@angular/core';
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
} from '@shared/components/table/table';
import { ButtonComponent } from '@shared/components/button/button';
import { DialogComponent } from '@shared/components/dialog/dialog';
import { FormInputComponent } from '@shared/components/form-input/form-input';
import { NotificationService } from '@shared/components/notification/notification.service';
import { SubdomainService } from '@shared/services';
import {
  Domain,
  Subdomain,
  CreateSubdomainRequest,
  UpdateSubdomainRequest,
} from '@shared/interfaces';
import { PrivilegeAccess } from '@shared/enums';

@Component({
  selector: 'app-domain-subdomains-manager',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableComponent,
    ButtonComponent,
    DialogComponent,
    FormInputComponent,
  ],
  templateUrl: './domain-subdomains-manager.html',
  styleUrl: './domain-subdomains-manager.scss',
})
export class DomainSubdomainsManagerComponent implements OnChanges, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  @Input() open = false;
  @Input() domain: Domain | null = null;
  @Output() closed = new EventEmitter<void>();

  protected readonly columns: TableColumn[] = [
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

  protected subdomains = signal<Subdomain[]>([]);
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
    private subdomainService: SubdomainService
  ) {
    this.subdomainForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      isActive: [true],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open === false) {
      this.resetManagerState();
      return;
    }
    if (!this.open || !this.domain) {
      return;
    }
    const opened = changes['open']?.currentValue === true;
    const domainChanged =
      !!changes['domain'] &&
      !changes['domain'].firstChange &&
      changes['domain'].previousValue !== changes['domain'].currentValue;
    if (opened || domainChanged) {
      this.currentPage = 1;
      this.loadSubdomains(
        1,
        this.currentLimit,
        '',
        this.sortBy,
        this.sortDirection,
        {}
      );
    }
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

  protected get managerTitle(): string {
    const t = this.domain?.title;
    return t ? `Subdomains — ${t}` : 'Subdomains';
  }

  protected get managerDescription(): string {
    return 'Create and manage subdomains linked to this domain.';
  }

  protected get isEditMode(): boolean {
    return !!this.selectedSubdomain;
  }

  protected get titleControl(): FormControl {
    return this.subdomainForm.get('title') as FormControl;
  }

  protected get isActiveControl(): FormControl {
    return this.subdomainForm.get('isActive') as FormControl;
  }

  protected get formDialogTitle(): string {
    return this.isEditMode ? 'Edit subdomain' : 'Create subdomain';
  }

  protected get formDialogDescription(): string {
    return this.isEditMode
      ? 'Update this subdomain.'
      : 'Add a new subdomain under this domain.';
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

  private loadSubdomains(
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
    sortDirection?: 'asc' | 'desc',
    filters?: Record<string, string>
  ): void {
    if (!this.domain?._id) {
      return;
    }

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

    const mergedFilters: Record<string, string> = {
      ...this.currentFilters,
      domain: this.domain._id,
    };

    this.subdomainService
      .findMany(
        page,
        limit,
        this.currentSearch,
        this.sortBy,
        this.sortDirection,
        mergedFilters
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
              'An error occurred while loading subdomains',
            'Failed to load subdomains'
          );
          this.subdomains.set([]);
          this.tableRows.set([]);
          this.totalCount.set(0);
          this.tableLoading.set(false);
        },
      });
  }

  private transformForTable(s: Subdomain): Record<string, unknown> {
    return {
      ...s,
      statusClass: s.isActive ? 'success' : 'warning',
      isActive: s.isActive ? 'Active' : 'Inactive',
    };
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

  protected onManagerClose(): void {
    this.closed.emit();
  }

  private resetManagerState(): void {
    this.closeFormDialog();
    this.closeDeleteDialog();
    this.subdomains.set([]);
    this.tableRows.set([]);
    this.totalCount.set(0);
    this.currentPage = 1;
    this.currentSearch = '';
    this.currentFilters = {};
    this.sortBy = undefined;
    this.sortDirection = undefined;
  }

  protected openCreateSubdomain(): void {
    if (!this.domain) {
      return;
    }
    this.selectedSubdomain = undefined;
    this.isFormDialogOpen = true;
    this.subdomainForm.reset({ title: '', isActive: true });
  }

  protected closeFormDialog(): void {
    if (this.dialogLoading()) {
      return;
    }
    this.isFormDialogOpen = false;
    this.selectedSubdomain = undefined;
    this.dialogLoading.set(false);
    this.subdomainForm.reset({ title: '', isActive: true });
  }

  protected onUpdate(row: Record<string, unknown>): void {
    const id = row['_id'] as string;
    const full = this.subdomains().find((s) => s._id === id);
    if (!full) {
      this.notifications.danger(
        'Subdomain not found',
        'Could not load subdomain for editing'
      );
      return;
    }
    this.selectedSubdomain = full;
    this.isFormDialogOpen = true;
    this.subdomainForm.patchValue({
      title: full.title,
      isActive: full.isActive,
    });
  }

  protected onDelete(row: Record<string, unknown>): void {
    const id = row['_id'] as string;
    const full = this.subdomains().find((s) => s._id === id);
    if (!full) {
      this.notifications.danger(
        'Subdomain not found',
        'Could not find subdomain to delete'
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
    if (!this.domain?._id || this.subdomainForm.invalid || this.dialogLoading()) {
      this.subdomainForm.markAllAsTouched();
      return;
    }

    this.dialogLoading.set(true);
    const { title, isActive } = this.subdomainForm.value;

    if (this.isEditMode && this.selectedSubdomain?._id) {
      const body: UpdateSubdomainRequest = {
        _id: this.selectedSubdomain._id,
        title,
        domain: this.domain._id,
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
              'Subdomain updated',
              `${title} has been updated`
            );
          },
          error: (error) => {
            console.error('Error updating subdomain:', error);
            this.dialogLoading.set(false);
            this.notifications.danger(
              error.error?.message || 'Unable to update subdomain',
              'Update failed'
            );
          },
        });
      return;
    }

    const body: CreateSubdomainRequest = {
      title,
      domain: this.domain._id,
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
            'Subdomain created',
            `${title} has been added`
          );
        },
        error: (error) => {
          console.error('Error creating subdomain:', error);
          this.dialogLoading.set(false);
          this.notifications.danger(
            error.error?.message || 'Unable to create subdomain',
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
            'Subdomain deleted',
            `${deletedTitle ?? 'Subdomain'} has been removed`
          );
          this.tableLoading.set(false);
        },
        error: (error) => {
          console.error('Error deleting subdomain:', error);
          this.deleteDialogLoading.set(false);
          this.tableLoading.set(false);
          this.notifications.danger(
            error.error?.message || 'Unable to delete subdomain',
            'Delete failed'
          );
        },
      });
  }
}
