import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormArray,
  FormControl,
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
import { AdminTypeService } from '../../../shared/services';
import {
  AdminType,
  CreateAdminTypeRequest,
  UpdateAdminTypeRequest,
} from '../../../shared/interfaces';
import { PrivilegeAccess } from '../../../shared/enums';
import { Functions, FunctionKeys } from '../../../shared/enums';

@Component({
  selector: 'app-admin-types-section',
  standalone: true,
  imports: [
    CommonModule,
    TableComponent,
    ButtonComponent,
    DialogComponent,
    ReactiveFormsModule,
    SidebarComponent,
  ],
  templateUrl: './admin-types.html',
  styleUrl: './admin-types.scss',
})
export class AdminTypesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  protected readonly columns: TableColumn[] = [
    { label: 'Admin Type', key: 'name', filterable: true, sortable: true },
    {
      label: 'Privileges Count',
      key: 'privilegesCount',
      filterable: true,
      sortable: true,
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

  protected adminTypes = signal<AdminType[]>([]);
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
  protected readonly functionKey = 'adminTypes';
  protected readonly writePrivilege = PrivilegeAccess.W;
  protected readonly deletePrivilege = PrivilegeAccess.D;
  protected readonly PrivilegeAccess = PrivilegeAccess;
  protected readonly Functions = Functions;
  protected readonly FunctionKeys = FunctionKeys;
  protected readonly functionKeysArray = Object.values(FunctionKeys);

  protected isDialogOpen = false;
  protected createTypeForm: FormGroup;
  protected selectedAdminType?: AdminType;
  protected isDeleteDialogOpen = false;
  protected adminTypeToDelete?: AdminType;
  protected isSidebarOpen = false;
  protected sidebarAdminType?: AdminType;

  constructor(
    private fb: FormBuilder,
    private notifications: NotificationService,
    private adminTypeService: AdminTypeService
  ) {
    this.createTypeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      privileges: this.fb.group({}),
      isActive: [true],
    });

    this.functionKeysArray.forEach((key) => {
      const functionId = Functions[key].functionId;
      const privilegesGroup = this.createTypeForm.get(
        'privileges'
      ) as FormGroup;
      privilegesGroup.addControl(
        functionId,
        this.fb.group({
          read: [false],
          write: [false],
          update: [false],
          delete: [false],
        })
      );
    });
  }

  ngOnInit(): void {
    this.tableLoading.set(false);
    this.loadAdminTypes(
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

  private loadAdminTypes(
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

    this.adminTypeService
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
          const transformedAdminTypes = response.data.map((adminType) =>
            this.transformAdminTypeForTable(adminType)
          );
          this.adminTypes.set(response.data);
          this.tableRows.set(transformedAdminTypes);
          this.totalCount.set(response.totalCount);
          this.tableLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading admin types:', error);
          this.notifications.danger(
            error.error?.message ||
              'An error occurred while loading admin types',
            'Failed to load admin types'
          );
          this.adminTypes.set([]);
          this.tableRows.set([]);
          this.totalCount.set(0);
          this.tableLoading.set(false);
        },
      });
  }

  protected transformAdminTypeForTable(
    adminType: AdminType
  ): Record<string, unknown> {
    return {
      ...adminType,
      privilegesCount: adminType.privileges?.length || 0,
      statusClass: adminType.isActive ? 'success' : 'warning',
      isActive: adminType.isActive ? 'Active' : 'Inactive',
    };
  }

  protected onPageChange(page: number): void {
    this.loadAdminTypes(
      page,
      this.currentLimit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onLimitChange(limit: number): void {
    this.loadAdminTypes(
      1,
      limit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onSearchChange(searchTerm: string): void {
    this.loadAdminTypes(
      1,
      this.currentLimit,
      searchTerm,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onFilterChange(filters: Record<string, string>): void {
    this.loadAdminTypes(
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
    this.loadAdminTypes(
      1,
      this.currentLimit,
      this.currentSearch,
      event.sortBy,
      event.sortDirection,
      this.currentFilters
    );
  }

  protected get isEditMode(): boolean {
    return !!this.selectedAdminType;
  }

  protected get dialogTitle(): string {
    return this.isEditMode ? 'Edit admin type' : 'Create admin type';
  }

  protected get dialogDescription(): string {
    return this.isEditMode
      ? 'Update admin type information and privileges.'
      : 'Group permissions into reusable admin roles.';
  }

  protected get isActiveControl(): FormControl {
    return this.createTypeForm.get('isActive') as FormControl;
  }

  protected get createButtonLabel(): string {
    if (this.dialogLoading()) {
      return this.isEditMode ? 'Updating...' : 'Creating...';
    }
    return this.isEditMode ? 'Update type' : 'Create type';
  }

  protected get deleteButtonLabel(): string {
    return this.deleteDialogLoading() ? 'Deleting...' : 'Delete';
  }

  protected openCreateTypeDialog() {
    this.selectedAdminType = undefined;
    this.isDialogOpen = true;
    this.resetForm();
  }

  protected closeCreateTypeDialog() {
    if (this.dialogLoading()) {
      return;
    }
    this.isDialogOpen = false;
    this.selectedAdminType = undefined;
    this.dialogLoading.set(false);
    this.resetForm();
  }

  private resetForm() {
    this.createTypeForm.reset({
      name: '',
      isActive: true,
    });

    const privilegesGroup = this.createTypeForm.get('privileges') as FormGroup;
    this.functionKeysArray.forEach((key) => {
      const functionId = Functions[key].functionId;
      const functionGroup = privilegesGroup.get(functionId) as FormGroup;
      if (functionGroup) {
        functionGroup.patchValue({
          read: false,
          write: false,
          update: false,
          delete: false,
        });
      }
    });
  }

  protected getPrivilegeControl(
    functionKey: FunctionKeys,
    permission: string
  ): FormControl {
    const functionId = Functions[functionKey].functionId;
    const privilegesGroup = this.createTypeForm.get('privileges') as FormGroup;
    const functionGroup = privilegesGroup.get(functionId) as FormGroup;
    return functionGroup.get(permission) as FormControl;
  }

  protected getFunctionName(functionKey: FunctionKeys): string {
    return (
      functionKey.charAt(0).toUpperCase() +
      functionKey.slice(1).replace(/_/g, ' ')
    );
  }

  protected selectAllPrivileges(): void {
    const privilegesGroup = this.createTypeForm.get('privileges') as FormGroup;
    this.functionKeysArray.forEach((key) => {
      const functionId = Functions[key].functionId;
      const functionGroup = privilegesGroup.get(functionId) as FormGroup;
      if (functionGroup) {
        functionGroup.patchValue({
          read: true,
          write: true,
          update: true,
          delete: true,
        });
      }
    });
  }

  protected unselectAllPrivileges(): void {
    const privilegesGroup = this.createTypeForm.get('privileges') as FormGroup;
    this.functionKeysArray.forEach((key) => {
      const functionId = Functions[key].functionId;
      const functionGroup = privilegesGroup.get(functionId) as FormGroup;
      if (functionGroup) {
        functionGroup.patchValue({
          read: false,
          write: false,
          update: false,
          delete: false,
        });
      }
    });
  }

  protected onCreateTypeSubmit() {
    this.createTypeForm.markAllAsTouched();
    if (this.createTypeForm.invalid || this.dialogLoading()) {
      return;
    }

    this.dialogLoading.set(true);
    this.tableLoading.set(true);
    const formValue = this.createTypeForm.value;
    const privilegesGroup = formValue.privileges as Record<string, any>;

    const privileges: Record<string, any> = {};
    Object.keys(privilegesGroup).forEach((functionId) => {
      const perm = privilegesGroup[functionId];
      if (perm.read || perm.write || perm.update || perm.delete) {
        privileges[functionId] = {
          read: perm.read || false,
          write: perm.write || false,
          update: perm.update || false,
          delete: perm.delete || false,
        };
      }
    });

    if (this.isEditMode && this.selectedAdminType?._id) {
      const updateData: UpdateAdminTypeRequest = {
        _id: this.selectedAdminType._id,
        name: formValue.name,
        privileges,
        ...(formValue.isActive !== undefined
          ? { isActive: (formValue.isActive ? 'true' : 'false') as string }
          : {}),
      };

      this.adminTypeService
        .update(updateData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (adminType) => {
            this.dialogLoading.set(false);
            this.closeCreateTypeDialog();
            this.loadAdminTypes(
              this.currentPage,
              this.currentLimit,
              this.currentSearch,
              this.sortBy,
              this.sortDirection,
              this.currentFilters
            );

            this.notifications.success(
              'Admin type updated',
              `${adminType.name} has been updated successfully`
            );
          },
          error: (error) => {
            console.error('Error updating admin type:', error);
            this.dialogLoading.set(false);
            this.notifications.danger(
              error.error?.message ||
                'An error occurred while updating the admin type',
              'Failed to update admin type'
            );
            this.tableLoading.set(false);
          },
        });
    } else {
      const createData: CreateAdminTypeRequest = {
        name: formValue.name,
        privileges,
        ...(formValue.isActive !== undefined
          ? { isActive: (formValue.isActive ? 'true' : 'false') as string }
          : {}),
      };

      this.adminTypeService
        .create(createData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (adminType) => {
            this.dialogLoading.set(false);
            this.closeCreateTypeDialog();
            this.loadAdminTypes(
              this.currentPage,
              this.currentLimit,
              this.currentSearch,
              this.sortBy,
              this.sortDirection,
              this.currentFilters
            );

            this.notifications.success(
              'Admin type created',
              `${adminType.name} has been created successfully`
            );
          },
          error: (error) => {
            console.error('Error creating admin type:', error);
            this.dialogLoading.set(false);
            this.notifications.danger(
              error.error?.message ||
                'An error occurred while creating the admin type',
              'Failed to create admin type'
            );
            this.tableLoading.set(false);
          },
        });
    }
  }

  protected onRead(adminType: Record<string, unknown>): void {
    const adminTypeId = adminType['_id'] as string;
    const fullAdminType = this.adminTypes().find((a) => a._id === adminTypeId);

    if (!fullAdminType) {
      this.notifications.danger(
        'Admin type not found',
        'Could not load admin type details'
      );
      return;
    }

    this.sidebarAdminType = fullAdminType;
    this.isSidebarOpen = true;
  }

  protected closeSidebar(): void {
    this.isSidebarOpen = false;
    this.sidebarAdminType = undefined;
  }

  protected get sidebarFields(): SidebarField[] {
    if (!this.sidebarAdminType) return [];
    return [
      {
        label: 'Name',
        key: 'name',
        type: 'text',
      },
      {
        label: 'Status',
        key: 'isActive',
        type: 'badge',
        badgeClassKey: 'statusClass',
        format: () => (this.sidebarAdminType?.isActive ? 'Active' : 'Inactive'),
      },
      {
        label: 'Privileges Count',
        key: 'privilegesCount',
        type: 'text',
        format: () => String(this.sidebarAdminType?.privileges?.length || 0),
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
    if (!this.sidebarAdminType) return {};
    return {
      ...this.sidebarAdminType,
      privilegesCount: this.sidebarAdminType.privileges?.length || 0,
      statusClass: this.sidebarAdminType.isActive ? 'success' : 'warning',
      isActive: this.sidebarAdminType.isActive ? 'Active' : 'Inactive',
    };
  }

  protected onUpdate(adminType: Record<string, unknown>): void {
    const adminTypeId = adminType['_id'] as string;
    const fullAdminType = this.adminTypes().find((a) => a._id === adminTypeId);

    if (!fullAdminType) {
      this.notifications.danger(
        'Admin type not found',
        'Could not load admin type details for editing'
      );
      return;
    }

    this.selectedAdminType = fullAdminType;
    this.isDialogOpen = true;

    this.createTypeForm.patchValue({
      name: fullAdminType.name,
      isActive: fullAdminType.isActive,
    });

    const privilegesGroup = this.createTypeForm.get('privileges') as FormGroup;
    if (fullAdminType.privileges && fullAdminType.privileges.length > 0) {
      fullAdminType.privileges.forEach((privilege) => {
        const functionId = privilege.function._id;
        const functionGroup = privilegesGroup.get(functionId) as FormGroup;
        if (functionGroup) {
          functionGroup.patchValue({
            read: privilege.read || false,
            write: privilege.write || false,
            update: privilege.update || false,
            delete: privilege.delete || false,
          });
        }
      });
    }
  }

  protected onDelete(adminType: Record<string, unknown>): void {
    const adminTypeId = adminType['_id'] as string;
    const fullAdminType = this.adminTypes().find((a) => a._id === adminTypeId);

    if (!fullAdminType) {
      this.notifications.danger(
        'Admin type not found',
        'Could not find admin type to delete'
      );
      return;
    }

    this.adminTypeToDelete = fullAdminType;
    this.isDeleteDialogOpen = true;
  }

  protected closeDeleteDialog() {
    if (this.deleteDialogLoading()) {
      return;
    }
    this.isDeleteDialogOpen = false;
    this.adminTypeToDelete = undefined;
    this.deleteDialogLoading.set(false);
  }

  protected confirmDelete() {
    if (!this.adminTypeToDelete?._id || this.deleteDialogLoading()) {
      return;
    }

    this.deleteDialogLoading.set(true);
    this.tableLoading.set(true);
    this.adminTypeService
      .delete(this.adminTypeToDelete._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleteDialogLoading.set(false);
          this.closeDeleteDialog();
          this.loadAdminTypes(
            this.currentPage,
            this.currentLimit,
            this.currentSearch,
            this.sortBy,
            this.sortDirection,
            this.currentFilters
          );

          this.notifications.success(
            'Admin type deleted',
            `${this.adminTypeToDelete?.name} has been deleted successfully`
          );
        },
        error: (error) => {
          console.error('Error deleting admin type:', error);
          this.deleteDialogLoading.set(false);
          this.notifications.danger(
            error.error?.message ||
              'An error occurred while deleting the admin type',
            'Failed to delete admin type'
          );
          this.tableLoading.set(false);
        },
      });
  }
}
