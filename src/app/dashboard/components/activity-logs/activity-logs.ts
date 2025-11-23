import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import {
  TableComponent,
  TableColumn,
} from '../../../shared/components/table/table';
import { NotificationService } from '../../../shared/components/notification/notification.service';
import { UserLogService, UserLog } from '../../../shared/services';

@Component({
  selector: 'app-activity-logs-section',
  standalone: true,
  imports: [CommonModule, TableComponent],
  templateUrl: './activity-logs.html',
  styleUrl: './activity-logs.scss',
})
export class ActivityLogsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  protected readonly columns: TableColumn[] = [
    { label: 'User', key: 'user', filterable: true, sortable: true },
    {
      label: 'Action',
      key: 'action',
      type: 'badge',
      badgeClassKey: 'actionTone',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'GET', value: 'get' },
        { label: 'POST', value: 'post' },
        { label: 'PUT', value: 'put' },
        { label: 'DELETE', value: 'delete' },
      ],
      sortable: true,
    },
    {
      label: 'Description',
      key: 'description',
      filterable: true,
      sortable: true,
    },
    { label: 'Table', key: 'table', filterable: true, sortable: true },
    { label: 'Date', key: 'createdAt', filterable: false, sortable: true },
  ];

  protected logs = signal<Array<Record<string, unknown>>>([]);
  protected totalCount = signal(0);
  protected tableLoading = signal(false);
  private currentPage = 1;
  private currentLimit = 10;
  private currentSearch = '';
  private currentFilters: Record<string, string> = {};
  protected sortBy?: string;
  protected sortDirection?: 'asc' | 'desc';

  constructor(
    private notifications: NotificationService,
    private userLogService: UserLogService
  ) {}

  ngOnInit(): void {
    this.tableLoading.set(false);
    this.loadLogs(this.currentPage, this.currentLimit);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadLogs(
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

    this.userLogService
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
          const transformedLogs = response.data.map((log) =>
            this.transformLogForTable(log)
          );
          this.logs.set(transformedLogs);
          this.totalCount.set(response.totalCount);
          this.tableLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading activity logs:', error);
          this.notifications.danger(
            error.error?.message ||
              'An error occurred while loading activity logs',
            'Failed to load activity logs'
          );
          this.logs.set([]);
          this.totalCount.set(0);
          this.tableLoading.set(false);
        },
      });
  }

  protected transformLogForTable(log: UserLog): Record<string, unknown> {
    const actionUpper = log.action.toUpperCase();
    const normalized = log.action.toLowerCase();
    let actionTone: string;
    switch (normalized) {
      case 'get':
        actionTone = 'info';
        break;
      case 'post':
        actionTone = 'success';
        break;
      case 'put':
        actionTone = 'warning';
        break;
      case 'delete':
        actionTone = 'danger';
        break;
      default:
        actionTone = 'neutral';
    }
    return {
      ...log,
      action: actionUpper,
      actionTone: actionTone,
      createdAt: this.formatDate(log.createdAt),
    };
  }

  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected onPageChange(page: number): void {
    this.loadLogs(
      page,
      this.currentLimit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onLimitChange(limit: number): void {
    this.loadLogs(
      1,
      limit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onSearchChange(searchTerm: string): void {
    this.loadLogs(
      1,
      this.currentLimit,
      searchTerm,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onFilterChange(filters: Record<string, string>): void {
    this.loadLogs(
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
    this.loadLogs(
      1,
      this.currentLimit,
      this.currentSearch,
      event.sortBy,
      event.sortDirection,
      this.currentFilters
    );
  }
}
