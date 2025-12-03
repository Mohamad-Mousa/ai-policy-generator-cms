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
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload';
import {
  SidebarComponent,
  SidebarField,
} from '../../../shared/components/sidebar/sidebar';
import { AdminService, AdminTypeService } from '../../../shared/services';
import { Admin, AdminType } from '../../../shared/interfaces';
import { PrivilegeAccess } from '../../../shared/enums';
import {
  FormInputComponent,
  SelectOption,
} from '../../../shared/components/form-input/form-input';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-admins-section',
  standalone: true,
  imports: [
    CommonModule,
    TableComponent,
    ButtonComponent,
    DialogComponent,
    ReactiveFormsModule,
    ImageUploadComponent,
    SidebarComponent,
    FormInputComponent,
  ],
  templateUrl: './admins.html',
  styleUrl: './admins.scss',
})
export class AdminsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  protected readonly columns: TableColumn[] = [
    {
      label: 'Image',
      key: 'image',
      type: 'image',
      filterable: false,
      sortable: false,
    },
    { label: 'Name', key: 'fullName', filterable: true, sortable: true },
    { label: 'Email', key: 'email', filterable: true, sortable: true },
    { label: 'Type', key: 'typeName', filterable: true, sortable: true },
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

  protected admins = signal<Admin[]>([]);
  protected tableRows = signal<Record<string, unknown>[]>([]);
  protected totalCount = signal(0);
  protected tableLoading = signal(false);
  protected adminTypes = signal<AdminType[]>([]);
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

  protected readonly statusOptions = ['Active', 'Pending'];
  protected readonly roleSuggestions = [
    'Global Admin',
    'Security Admin',
    'Billing Admin',
  ];
  protected readonly excludedActions: Array<
    'canRead' | 'canWrite' | 'canEdit' | 'canDelete'
  > = ['canWrite'];
  protected readonly functionKey = 'admins';
  protected readonly writePrivilege = PrivilegeAccess.W;
  protected readonly deletePrivilege = PrivilegeAccess.D;
  protected readonly PrivilegeAccess = PrivilegeAccess;

  protected isDialogOpen = false;
  protected createAdminForm: FormGroup;
  protected selectedImageFile?: File;
  protected imagePreview?: string;
  protected selectedAdmin?: Admin;
  protected isDeleteDialogOpen = false;
  protected adminToDelete?: Admin;
  protected isSidebarOpen = false;
  protected sidebarAdmin?: Admin;

  constructor(
    private fb: FormBuilder,
    private notifications: NotificationService,
    private adminService: AdminService,
    private adminTypeService: AdminTypeService
  ) {
    this.createAdminForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      type: ['', Validators.required],
      image: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.tableLoading.set(false);
    this.loadAdmins(
      this.currentPage,
      this.currentLimit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
    this.loadAdminTypes();
  }

  private loadAdminTypes(): void {
    this.adminTypeService
      .findMany(1, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const activeTypes = response.data.filter((type) => type.isActive);
          this.adminTypes.set(activeTypes);
        },
        error: (error) => {
          console.error('Error loading admin types:', error);
          this.notifications.danger(
            error.error?.message ||
              'An error occurred while loading admin types',
            'Failed to load admin types'
          );
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAdmins(
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

    this.adminService
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
          this.admins.set(response.data);
          const transformedAdmins = response.data.map((admin) =>
            this.transformAdminForTable(admin)
          );
          this.tableRows.set(transformedAdmins);
          this.totalCount.set(response.totalCount);
          this.tableLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading admins:', error);
          this.notifications.danger(
            error.error?.message || 'An error occurred while loading admins',
            'Failed to load admins'
          );
          this.admins.set([]);
          this.tableRows.set([]);
          this.totalCount.set(0);
          this.tableLoading.set(false);
        },
      });
  }

  protected transformAdminForTable(admin: Admin): Record<string, unknown> {
    return {
      ...admin,
      fullName: `${admin.firstName} ${admin.lastName}`,
      typeName: admin.type?.name || 'N/A',
      statusClass: admin.isActive ? 'success' : 'warning',
      isActive: admin.isActive ? 'Active' : 'Inactive',
      image: admin.image || undefined,
    };
  }

  protected onPageChange(page: number): void {
    this.loadAdmins(
      page,
      this.currentLimit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onLimitChange(limit: number): void {
    this.loadAdmins(
      1,
      limit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onSearchChange(searchTerm: string): void {
    this.loadAdmins(
      1,
      this.currentLimit,
      searchTerm,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onFilterChange(filters: Record<string, string>): void {
    this.loadAdmins(
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
    this.loadAdmins(
      1,
      this.currentLimit,
      this.currentSearch,
      event.sortBy,
      event.sortDirection,
      this.currentFilters
    );
  }

  protected get isEditMode(): boolean {
    return !!this.selectedAdmin;
  }

  protected get adminTypeOptions(): SelectOption[] {
    return this.adminTypes().map((type) => ({
      label: type.name,
      value: type._id,
    }));
  }

  protected get emailControl(): FormControl {
    return this.createAdminForm.get('email') as FormControl;
  }

  protected get firstNameControl(): FormControl {
    return this.createAdminForm.get('firstName') as FormControl;
  }

  protected get lastNameControl(): FormControl {
    return this.createAdminForm.get('lastName') as FormControl;
  }

  protected get passwordControl(): FormControl {
    return this.createAdminForm.get('password') as FormControl;
  }

  protected get typeControl(): FormControl {
    return this.createAdminForm.get('type') as FormControl;
  }

  protected get isActiveControl(): FormControl {
    return this.createAdminForm.get('isActive') as FormControl;
  }

  protected get dialogTitle(): string {
    return this.isEditMode ? 'Edit administrator' : 'Create administrator';
  }

  protected get dialogDescription(): string {
    return this.isEditMode
      ? 'Update administrator information.'
      : 'Add a new administrator to the system.';
  }

  protected get createButtonLabel(): string {
    if (this.dialogLoading()) {
      return this.isEditMode ? 'Updating...' : 'Creating...';
    }
    return this.isEditMode ? 'Update admin' : 'Create admin';
  }

  protected get deleteButtonLabel(): string {
    return this.deleteDialogLoading() ? 'Deleting...' : 'Delete';
  }

  protected openCreateAdminDialog() {
    this.selectedAdmin = undefined;
    this.isDialogOpen = true;
    this.resetForm();
  }

  protected closeCreateAdminDialog() {
    if (this.dialogLoading()) {
      return;
    }
    this.isDialogOpen = false;
    this.selectedAdmin = undefined;
    this.selectedImageFile = undefined;
    this.imagePreview = undefined;
    this.dialogLoading.set(false);
    this.resetForm();
  }

  private resetForm() {
    this.createAdminForm.reset({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      type: '',
      image: '',
      isActive: true,
    });
    const passwordControl = this.createAdminForm.get('password');
    passwordControl?.setValidators([
      Validators.required,
      Validators.minLength(6),
    ]);
    passwordControl?.updateValueAndValidity();
  }

  protected onImageFileSelected(file: File) {
    this.selectedImageFile = file;
  }

  protected onImageChange(value?: string) {
    this.imagePreview = environment.IMG_URL + value;
    const control = this.createAdminForm.get('image');
    control?.setValue(value ?? '', { emitEvent: true });
  }

  protected onCreateAdminSubmit() {
    this.createAdminForm.markAllAsTouched();
    if (this.createAdminForm.invalid || this.dialogLoading()) {
      return;
    }

    this.dialogLoading.set(true);
    this.tableLoading.set(true);
    const formValue = this.createAdminForm.value;

    const adminData: Omit<Partial<Admin>, 'isActive'> & {
      isActive?: boolean;
      password?: string;
    } = {
      email: formValue.email,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      type: formValue.type,
      isActive: formValue.isActive ? true : false,
      ...(formValue.password ? { password: formValue.password } : {}),
    };

    if (this.isEditMode && this.selectedAdmin?._id) {
      adminData['_id'] = this.selectedAdmin._id;
    }

    const operation = this.isEditMode
      ? this.adminService.update(
          adminData as Partial<Admin>,
          this.selectedImageFile
        )
      : this.adminService.create(
          adminData as Partial<Admin>,
          this.selectedImageFile
        );

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (admin) => {
        this.dialogLoading.set(false);
        this.closeCreateAdminDialog();
        this.loadAdmins(
          this.currentPage,
          this.currentLimit,
          this.currentSearch,
          this.sortBy,
          this.sortDirection,
          this.currentFilters
        );

        this.notifications.success(
          this.isEditMode ? 'Admin updated' : 'Admin created',
          `${admin.firstName} ${admin.lastName} has been ${
            this.isEditMode ? 'updated' : 'added'
          } successfully`
        );
      },
      error: (error) => {
        console.error(
          `Error ${this.isEditMode ? 'updating' : 'creating'} admin:`,
          error
        );
        this.dialogLoading.set(false);
        this.notifications.danger(
          error.error?.message ||
            `An error occurred while ${
              this.isEditMode ? 'updating' : 'creating'
            } the admin`,
          `Failed to ${this.isEditMode ? 'update' : 'create'} admin`
        );
        this.tableLoading.set(false);
      },
    });
  }

  protected onRead(admin: Record<string, unknown>): void {
    const adminId = admin['_id'] as string;
    const fullAdmin = this.admins().find((a) => a._id === adminId);

    if (!fullAdmin) {
      this.notifications.danger(
        'Admin not found',
        'Could not load admin details'
      );
      return;
    }

    this.sidebarAdmin = fullAdmin;
    this.isSidebarOpen = true;
  }

  protected closeSidebar(): void {
    this.isSidebarOpen = false;
    this.sidebarAdmin = undefined;
  }

  protected get sidebarFields(): SidebarField[] {
    if (!this.sidebarAdmin) return [];
    return [
      {
        label: 'Email',
        key: 'email',
        type: 'text',
      },
      {
        label: 'First Name',
        key: 'firstName',
        type: 'text',
      },
      {
        label: 'Last Name',
        key: 'lastName',
        type: 'text',
      },
      {
        label: 'Full Name',
        key: 'fullName',
        type: 'text',
        format: () =>
          `${this.sidebarAdmin?.firstName} ${this.sidebarAdmin?.lastName}`,
      },
      {
        label: 'Type',
        key: 'typeName',
        type: 'text',
        format: () => this.sidebarAdmin?.type?.name || 'N/A',
      },
      {
        label: 'Status',
        key: 'isActive',
        type: 'badge',
        badgeClassKey: 'statusClass',
        format: () => (this.sidebarAdmin?.isActive ? 'Active' : 'Inactive'),
      },
      {
        label: 'Image',
        key: 'image',
        type: 'image',
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
    if (!this.sidebarAdmin) return {};
    return {
      ...this.sidebarAdmin,
      fullName: `${this.sidebarAdmin.firstName} ${this.sidebarAdmin.lastName}`,
      typeName: this.sidebarAdmin.type?.name || 'N/A',
      statusClass: this.sidebarAdmin.isActive ? 'success' : 'warning',
      isActive: this.sidebarAdmin.isActive ? 'Active' : 'Inactive',
      image: this.sidebarAdmin.image || '',
    };
  }

  protected onUpdate(admin: Record<string, unknown>): void {
    const adminId = admin['_id'] as string;
    const fullAdmin = this.admins().find((a) => a._id === adminId);

    if (!fullAdmin) {
      this.notifications.danger(
        'Admin not found',
        'Could not load admin details for editing'
      );
      return;
    }

    this.selectedAdmin = fullAdmin;
    this.isDialogOpen = true;

    this.createAdminForm.patchValue({
      email: fullAdmin.email,
      firstName: fullAdmin.firstName,
      lastName: fullAdmin.lastName,
      type: fullAdmin.type?._id || '',
      image: fullAdmin.image || '',
      isActive: fullAdmin.isActive,
    });

    if (fullAdmin.image) {
      this.imagePreview = environment.IMG_URL + fullAdmin.image;
    }

    const passwordControl = this.createAdminForm.get('password');
    passwordControl?.clearValidators();
    passwordControl?.updateValueAndValidity();

    if (fullAdmin.image) {
      this.imagePreview = environment.IMG_URL + fullAdmin.image;
    }
  }

  protected onDelete(admin: Record<string, unknown>): void {
    const adminId = admin['_id'] as string;
    const fullAdmin = this.admins().find((a) => a._id === adminId);

    if (!fullAdmin) {
      this.notifications.danger(
        'Admin not found',
        'Could not find admin to delete'
      );
      return;
    }

    this.adminToDelete = fullAdmin;
    this.isDeleteDialogOpen = true;
  }

  protected closeDeleteDialog() {
    if (this.deleteDialogLoading()) {
      return;
    }
    this.isDeleteDialogOpen = false;
    this.adminToDelete = undefined;
    this.deleteDialogLoading.set(false);
  }

  protected confirmDelete() {
    if (!this.adminToDelete?._id || this.deleteDialogLoading()) {
      return;
    }

    this.deleteDialogLoading.set(true);
    this.tableLoading.set(true);
    this.adminService
      .delete(this.adminToDelete._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleteDialogLoading.set(false);
          this.closeDeleteDialog();
          this.loadAdmins(
            this.currentPage,
            this.currentLimit,
            this.currentSearch,
            this.sortBy,
            this.sortDirection,
            this.currentFilters
          );

          this.notifications.success(
            'Admin deleted',
            `${this.adminToDelete?.firstName} ${this.adminToDelete?.lastName} has been deleted successfully`
          );
        },
        error: (error) => {
          console.error('Error deleting admin:', error);
          this.deleteDialogLoading.set(false);
          this.notifications.danger(
            error.error?.message ||
              'An error occurred while deleting the admin',
            'Failed to delete admin'
          );
          this.tableLoading.set(false);
        },
      });
  }
}
