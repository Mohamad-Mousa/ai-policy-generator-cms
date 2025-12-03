import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  Input,
  Output,
  EventEmitter,
  inject,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { StatusPillComponent, PillTone } from '../pill/pill';
import { LoaderComponent } from '../loader/loader';
import { AuthService } from '@shared/services';
import { PrivilegeAccess } from '@shared/enums';
import { environment } from '../../../../environments/environment';

export interface TableColumn {
  label: string;
  key: string;
  type?: 'text' | 'badge' | 'image' | 'icon' | 'tags';
  badgeClassKey?: string;
  filterable?: boolean;
  filterType?: 'text' | 'select';
  filterOptions?: Array<{ label: string; value: string }> | string[];
  sortable?: boolean;
}

type ActionKey = 'canRead' | 'canWrite' | 'canEdit' | 'canDelete';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule, StatusPillComponent, LoaderComponent],
  templateUrl: './table.html',
  styleUrl: './table.scss',
})
export class TableComponent implements OnDestroy, OnChanges {
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  private filterSubject = new Subject<Record<string, string>>();

  @Input({ required: true }) columns: TableColumn[] = [];
  @Input({ required: true }) rows: Array<Record<string, unknown>> = [];
  @Input() totalCount = 0;
  @Input() emptyMessage = 'No data available';
  @Input() showActions = false;
  @Input() enableFilters = false;
  @Input() enableSorting = false;
  @Input() enableGlobalSearch = true;
  @Input() enablePagination = true;
  @Input() pageSizeOptions = [10, 25, 50, 100];
  @Input() loading = false;
  @Input() loadingLabel = 'Loading data...';
  @Input() functionKey?: string;
  @Input() excludedActions: ActionKey[] = [];
  @Input() searchDebounceTime = 500;
  @Input() serverSideSearch = false;
  @Input() serverSideFilters = false;
  @Input() sortBy?: string;
  @Input() sortDirection?: 'asc' | 'desc';
  @Input() enableSelection = false;
  @Input() selectionKey = '_id';
  @Input() selectedRows: Array<string | number> = [];
  @Input() currentPageInput?: number;
  @Input() pageSizeInput?: number;
  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<Record<string, string>>();
  @Output() sortChange = new EventEmitter<{
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  }>();
  @Output() selectionChange = new EventEmitter<Array<Record<string, unknown>>>();
  @Output() readAction = new EventEmitter<Record<string, unknown>>();
  @Output() writeAction = new EventEmitter<Record<string, unknown>>();
  @Output() updateAction = new EventEmitter<Record<string, unknown>>();
  @Output() deleteAction = new EventEmitter<Record<string, unknown>>();

  protected currentPage = 1;
  protected pageSize = 10;

  protected openRowIndex: number | null = null;
  protected filters: Record<string, string> = {};
  protected internalSortColumn?: string;
  protected internalSortDirection: 'asc' | 'desc' = 'asc';
  protected globalSearch = '';
  protected selectedRowIds = new Set<string | number>();

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(this.searchDebounceTime),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm) => {
        this.searchChange.emit(searchTerm);
      });

    this.filterSubject
      .pipe(
        debounceTime(this.searchDebounceTime),
        distinctUntilChanged((prev, curr) => {
          return JSON.stringify(prev) === JSON.stringify(curr);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((filters) => {
        this.filterChange.emit(filters);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sortBy'] || changes['sortDirection']) {
      if (this.sortBy !== undefined) {
        this.internalSortColumn = this.sortBy;
      } else if (changes['sortBy']?.previousValue !== undefined) {
        this.internalSortColumn = undefined;
      }
      if (this.sortDirection !== undefined) {
        this.internalSortDirection = this.sortDirection;
      }
    }

    if (changes['selectedRows']) {
      this.selectedRowIds = new Set(this.selectedRows);
    }

    // Sync current page from parent when using server-side pagination
    if (changes['currentPageInput'] && this.currentPageInput !== undefined) {
      this.currentPage = this.currentPageInput;
    }

    // Sync page size from parent when using server-side pagination
    if (changes['pageSizeInput'] && this.pageSizeInput !== undefined) {
      this.pageSize = this.pageSizeInput;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected readonly allActionKeys: ActionKey[] = [
    'canRead',
    'canWrite',
    'canEdit',
    'canDelete',
  ];

  protected get actionKeys(): ActionKey[] {
    return this.allActionKeys.filter(
      (key) => !this.excludedActions.includes(key)
    );
  }

  protected readonly actionLabels: Record<ActionKey, string> = {
    canRead: 'Read',
    canWrite: 'Create',
    canEdit: 'Edit',
    canDelete: 'Delete',
  };
  protected readonly actionIcons: Record<ActionKey, string> = {
    canRead: 'visibility',
    canWrite: 'add',
    canEdit: 'edit',
    canDelete: 'delete',
  };

  protected readonly actionPrivilegeMap: Record<ActionKey, PrivilegeAccess> = {
    canRead: PrivilegeAccess.R,
    canWrite: PrivilegeAccess.W,
    canEdit: PrivilegeAccess.U,
    canDelete: PrivilegeAccess.D,
  };

  protected isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  protected hasTagValues(
    row: Record<string, unknown>,
    column: TableColumn
  ): boolean {
    const value = row[column.key];
    return this.isArray(value) && value.length > 0;
  }

  protected tagValues(
    row: Record<string, unknown>,
    column: TableColumn
  ): string[] {
    const value = row[column.key];
    return this.isArray(value) ? (value as string[]) : [];
  }

  protected get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize) || 1;
  }

  protected get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  protected get endIndex(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalCount ? this.totalCount : end;
  }

  protected get hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  protected get hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  protected get activeSortColumn(): string | undefined {
    return this.sortBy ?? this.internalSortColumn;
  }

  protected get activeSortDirection(): 'asc' | 'desc' {
    if (this.sortDirection !== undefined) {
      return this.sortDirection;
    }
    return this.internalSortColumn ? this.internalSortDirection : 'asc';
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    // Only emit if page actually changed (to avoid unnecessary events)
    if (page !== this.currentPage) {
      this.currentPage = page;
      this.pageChange.emit(page);
    }
  }

  protected onPageSizeChange(size: number): void {
    if (size === this.pageSize) {
      return;
    }

    this.pageSize = size;
    this.currentPage = 1;
    this.limitChange.emit(size);
    this.pageChange.emit(1);
  }

  protected previousPage(): void {
    if (this.hasPreviousPage) {
      this.goToPage(this.currentPage - 1);
    }
  }

  protected nextPage(): void {
    if (this.hasNextPage) {
      this.goToPage(this.currentPage + 1);
    }
  }

  protected firstPage(): void {
    this.goToPage(1);
  }

  protected lastPage(): void {
    this.goToPage(this.totalPages);
  }

  protected badgeClassFor(
    row: Record<string, unknown>,
    column: TableColumn
  ): PillTone {
    if (column.badgeClassKey) {
      const value = row[column.badgeClassKey];
      if (typeof value === 'string') {
        return this.mapTone(value);
      }
    }

    return 'neutral';
  }

  protected actionBadgeClass(row: Record<string, unknown>, key: ActionKey) {
    return this.actionEnabled(row, key)
      ? 'bg-primary-subtle text-primary-emphasis'
      : 'bg-light text-muted border';
  }

  protected actionEnabled(
    row: Record<string, unknown>,
    key: ActionKey
  ): boolean {
    if (this.functionKey) {
      const access = this.actionPrivilegeMap[key];
      return this.authService.hasPrivilege(this.functionKey, access);
    }
    return Boolean(row[key]);
  }

  protected onActionClick(row: Record<string, unknown>, key: ActionKey): void {
    switch (key) {
      case 'canRead':
        this.readAction.emit(row);
        break;
      case 'canWrite':
        this.writeAction.emit(row);
        break;
      case 'canEdit':
        this.updateAction.emit(row);
        break;
      case 'canDelete':
        this.deleteAction.emit(row);
        break;
    }
    this.closeActions();
  }

  protected toggleActions(index: number): void {
    this.openRowIndex = this.openRowIndex === index ? null : index;
  }

  protected onFilterChange(columnKey: string, value: string): void {
    if (value === '' || value === null || value === undefined) {
      const { [columnKey]: _, ...rest } = this.filters;
      this.filters = rest;
    } else {
      this.filters = {
        ...this.filters,
        [columnKey]: value,
      };
    }

    if (this.serverSideFilters) {
      if (this.currentPage !== 1) {
        this.currentPage = 1;
        this.pageChange.emit(1);
      }
      this.filterSubject.next({ ...this.filters });
    }
  }

  protected filterValue(columnKey: string): string {
    return this.filters[columnKey] ?? '';
  }

  protected toggleSort(column: TableColumn): void {
    if (!this.enableSorting || column.sortable === false) return;
    const key = column.key;
    const currentSortColumn = this.activeSortColumn;
    const currentSortDirection = this.activeSortDirection;
    let newDirection: 'asc' | 'desc' = 'asc';

    if (currentSortColumn === key) {
      newDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      newDirection = 'asc';
    }

    this.internalSortColumn = key;
    this.internalSortDirection = newDirection;

    this.sortChange.emit({
      sortBy: key,
      sortDirection: newDirection,
    });
  }

  protected clearSort(): void {
    this.internalSortColumn = undefined;
    this.internalSortDirection = 'asc';
  }

  protected onGlobalSearchChange(value: string): void {
    this.globalSearch = value;
    this.searchSubject.next(value.trim());
  }

  protected get processedRows(): Array<Record<string, unknown>> {
    let data = [...this.rows];

    if (
      this.enableFilters &&
      this.enableGlobalSearch &&
      !this.serverSideSearch
    ) {
      const query = this.globalSearch.trim().toLowerCase();
      if (query) {
        data = data.filter((row) =>
          this.columns.some((column) =>
            String(row[column.key] ?? '')
              .toLowerCase()
              .includes(query)
          )
        );
      }
    }

    if (this.enableFilters && !this.serverSideFilters) {
      for (const column of this.columns) {
        if (!column.filterable || !this.filters[column.key]) continue;
        const filterValue = this.filters[column.key].toLowerCase().trim();
        if (!filterValue) continue;
        data = data.filter((row) => {
          const cell = row[column.key];
          return String(cell ?? '')
            .toLowerCase()
            .includes(filterValue);
        });
      }
    }

    const activeSortColumn = this.activeSortColumn;
    const activeSortDirection = this.activeSortDirection;

    if (this.enableSorting && activeSortColumn) {
      const column = this.columns.find((col) => col.key === activeSortColumn);
      if (column) {
        const direction = activeSortDirection === 'asc' ? 1 : -1;
        data = [...data].sort((a, b) => {
          const valueA = a[column.key];
          const valueB = b[column.key];
          if (valueA == null && valueB == null) return 0;
          if (valueA == null) return -direction;
          if (valueB == null) return direction;
          return String(valueA).localeCompare(String(valueB)) * direction;
        });
      }
    }

    return data;
  }

  @HostListener('document:click')
  protected closeActions(): void {
    this.openRowIndex = null;
  }

  protected cellLabel(
    row: Record<string, unknown>,
    column: TableColumn
  ): string {
    const value = row[column.key];
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  protected getImageUrl(
    row: Record<string, unknown>,
    column: TableColumn
  ): string | undefined {
    const value = row[column.key];
    if (!value || typeof value !== 'string') {
      return undefined;
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }

    return environment.IMG_URL + value;
  }

  private mapTone(value: string): PillTone {
    const normalized = value.toLowerCase();
    if (normalized.includes('active') || normalized.includes('success')) {
      return 'success';
    }
    if (normalized.includes('pending') || normalized.includes('warning')) {
      return 'warning';
    }
    if (normalized.includes('error') || normalized.includes('danger')) {
      return 'danger';
    }
    if (normalized.includes('info')) {
      return 'info';
    }
    return 'neutral';
  }

  protected getRowId(row: Record<string, unknown>): string | number {
    const id = row[this.selectionKey];
    if (id === null || id === undefined) {
      throw new Error(
        `Row is missing the selection key "${this.selectionKey}". Please provide a valid selectionKey or ensure rows have this property.`
      );
    }
    return id as string | number;
  }

  protected isRowSelected(row: Record<string, unknown>): boolean {
    if (!this.enableSelection) return false;
    const id = this.getRowId(row);
    return this.selectedRowIds.has(id);
  }

  protected toggleRowSelection(row: Record<string, unknown>): void {
    if (!this.enableSelection) return;
    const id = this.getRowId(row);

    if (this.selectedRowIds.has(id)) {
      this.selectedRowIds.delete(id);
    } else {
      this.selectedRowIds.add(id);
    }

    this.emitSelectionChange();
  }

  protected get isAllSelected(): boolean {
    if (!this.enableSelection || this.processedRows.length === 0) {
      return false;
    }
    return this.processedRows.every((row) => this.isRowSelected(row));
  }

  protected get isSomeSelected(): boolean {
    if (!this.enableSelection || this.processedRows.length === 0) {
      return false;
    }
    return (
      this.processedRows.some((row) => this.isRowSelected(row)) &&
      !this.isAllSelected
    );
  }

  protected toggleSelectAll(): void {
    if (!this.enableSelection) return;

    if (this.isAllSelected) {
      // Deselect all visible rows
      this.processedRows.forEach((row) => {
        const id = this.getRowId(row);
        this.selectedRowIds.delete(id);
      });
    } else {
      // Select all visible rows
      this.processedRows.forEach((row) => {
        const id = this.getRowId(row);
        this.selectedRowIds.add(id);
      });
    }

    this.emitSelectionChange();
  }

  private emitSelectionChange(): void {
    const selectedRows = this.rows.filter((row) => {
      const id = this.getRowId(row);
      return this.selectedRowIds.has(id);
    });
    this.selectionChange.emit(selectedRows);
  }

  protected get selectedCount(): number {
    return this.selectedRowIds.size;
  }
}
