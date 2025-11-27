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
import { QuestionService, DomainService } from '../../../shared/services';
import {
  Question,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  Domain,
} from '../../../shared/interfaces';
import { PrivilegeAccess } from '../../../shared/enums';
import { FormInputComponent } from '../../../shared/components/form-input/form-input';

@Component({
  selector: 'app-questions-section',
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
  templateUrl: './questions.html',
  styleUrl: './questions.scss',
})
export class QuestionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  protected readonly columns: TableColumn[] = [
    { label: 'Question', key: 'question', filterable: true, sortable: true },
    {
      label: 'Domain',
      key: 'domain',
      filterable: true,
      filterType: 'select',
      filterOptions: [],
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

  protected questions = signal<Question[]>([]);
  protected domains = signal<Domain[]>([]);
  protected tableRows = signal<Record<string, unknown>[]>([]);
  protected totalCount = signal(0);
  protected tableLoading = signal(false);
  protected dialogLoading = signal(false);
  protected deleteDialogLoading = signal(false);
  protected domainsLoading = signal(false);
  private currentPage = 1;
  private currentLimit = 10;
  private currentSearch = '';
  private currentFilters: Record<string, string> = {};
  protected sortBy?: string;
  protected sortDirection?: 'asc' | 'desc';

  protected readonly excludedActions: Array<
    'canRead' | 'canWrite' | 'canEdit' | 'canDelete'
  > = ['canWrite'];
  protected readonly functionKey = 'questions';
  protected readonly writePrivilege = PrivilegeAccess.W;
  protected readonly deletePrivilege = PrivilegeAccess.D;
  protected readonly PrivilegeAccess = PrivilegeAccess;

  protected isDialogOpen = false;
  protected questionForm: FormGroup;
  protected selectedQuestion?: Question;
  protected isDeleteDialogOpen = false;
  protected questionToDelete?: Question;
  protected isSidebarOpen = false;
  protected sidebarQuestion?: Question;

  constructor(
    private fb: FormBuilder,
    private notifications: NotificationService,
    private questionService: QuestionService,
    private domainService: DomainService
  ) {
    this.questionForm = this.fb.group({
      question: ['', [Validators.required, Validators.minLength(3)]],
      domain: ['', [Validators.required]],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadDomains();
    this.tableLoading.set(false);
    this.loadQuestions(
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

  private loadDomains(): void {
    this.domainsLoading.set(true);
    this.domainService
      .findMany(1, 100, undefined, undefined, undefined, { isActive: 'true' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.domains.set(response.data);
          // Update domain filter options
          const domainColumn = this.columns.find((col) => col.key === 'domain');
          if (domainColumn) {
            domainColumn.filterOptions = response.data.map((domain) => ({
              label: domain.title,
              value: domain._id,
            }));
          }
          this.domainsLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading domains:', error);
          this.domainsLoading.set(false);
        },
      });
  }

  private loadQuestions(
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

    this.questionService
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
          const transformedQuestions = response.data.map((question) =>
            this.transformQuestionForTable(question)
          );
          this.questions.set(response.data);
          this.tableRows.set(transformedQuestions);
          this.totalCount.set(response.totalCount);
          this.tableLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading questions:', error);
          this.notifications.danger(
            error.error?.message || 'An error occurred while loading questions',
            'Failed to load questions'
          );
          this.questions.set([]);
          this.tableRows.set([]);
          this.totalCount.set(0);
          this.tableLoading.set(false);
        },
      });
  }

  protected transformQuestionForTable(
    question: Question
  ): Record<string, unknown> {
    return {
      ...question,
      statusClass: question.isActive ? 'success' : 'warning',
      isActive: question.isActive ? 'Active' : 'Inactive',
      domain: question.domain?.title || '—',
    };
  }

  protected onPageChange(page: number): void {
    this.loadQuestions(
      page,
      this.currentLimit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onLimitChange(limit: number): void {
    this.loadQuestions(
      1,
      limit,
      this.currentSearch,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onSearchChange(searchTerm: string): void {
    this.loadQuestions(
      1,
      this.currentLimit,
      searchTerm,
      this.sortBy,
      this.sortDirection,
      this.currentFilters
    );
  }

  protected onFilterChange(filters: Record<string, string>): void {
    this.loadQuestions(
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
    this.loadQuestions(
      1,
      this.currentLimit,
      this.currentSearch,
      event.sortBy,
      event.sortDirection,
      this.currentFilters
    );
  }

  protected get isEditMode(): boolean {
    return !!this.selectedQuestion;
  }

  protected get questionControl(): FormControl {
    return this.questionForm.get('question') as FormControl;
  }

  protected get domainControl(): FormControl {
    return this.questionForm.get('domain') as FormControl;
  }

  protected get isActiveControl(): FormControl {
    return this.questionForm.get('isActive') as FormControl;
  }

  protected get dialogTitle(): string {
    return this.isEditMode ? 'Edit question' : 'Create question';
  }

  protected get dialogDescription(): string {
    return this.isEditMode
      ? 'Update question information.'
      : 'Add a new question to the system.';
  }

  protected get createButtonLabel(): string {
    if (this.dialogLoading()) {
      return this.isEditMode ? 'Updating...' : 'Creating...';
    }
    return this.isEditMode ? 'Update question' : 'Create question';
  }

  protected get deleteButtonLabel(): string {
    return this.deleteDialogLoading() ? 'Deleting...' : 'Delete';
  }

  protected get domainOptions() {
    return this.domains().map((domain) => ({
      label: domain.title,
      value: domain._id,
    }));
  }

  protected openCreateQuestionDialog() {
    this.selectedQuestion = undefined;
    this.isDialogOpen = true;
    this.resetForm();
  }

  protected closeDialog() {
    if (this.dialogLoading()) {
      return;
    }
    this.isDialogOpen = false;
    this.selectedQuestion = undefined;
    this.dialogLoading.set(false);
    this.resetForm();
  }

  private resetForm() {
    this.questionForm.reset({
      question: '',
      domain: '',
      isActive: true,
    });
  }

  protected onSubmit() {
    this.questionForm.markAllAsTouched();
    if (this.questionForm.invalid || this.dialogLoading()) {
      return;
    }

    this.dialogLoading.set(true);
    this.tableLoading.set(true);
    const formValue = this.questionForm.value;

    const questionData: CreateQuestionRequest | UpdateQuestionRequest = {
      question: formValue.question.trim(),
      domain: formValue.domain,
      ...(formValue.isActive !== undefined && {
        isActive: formValue.isActive ? 'true' : 'false',
      }),
    };

    if (this.isEditMode && this.selectedQuestion?._id) {
      (questionData as UpdateQuestionRequest)._id = this.selectedQuestion._id;
    }

    const operation = this.isEditMode
      ? this.questionService.update(questionData as UpdateQuestionRequest)
      : this.questionService.create(questionData as CreateQuestionRequest);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (question) => {
        const wasEditMode = this.isEditMode;
        this.dialogLoading.set(false);
        this.closeDialog();
        this.loadQuestions(
          this.currentPage,
          this.currentLimit,
          this.currentSearch,
          this.sortBy,
          this.sortDirection,
          this.currentFilters
        );

        this.notifications.success(
          wasEditMode ? 'Question updated' : 'Question created',
          `Question has been ${wasEditMode ? 'updated' : 'added'} successfully`
        );
      },
      error: (error) => {
        console.error(
          `Error ${this.isEditMode ? 'updating' : 'creating'} question:`,
          error
        );
        this.dialogLoading.set(false);
        this.notifications.danger(
          error.error?.message ||
            `An error occurred while ${
              this.isEditMode ? 'updating' : 'creating'
            } the question`,
          `Failed to ${this.isEditMode ? 'update' : 'create'} question`
        );
        this.tableLoading.set(false);
      },
    });
  }

  protected onRead(question: Record<string, unknown>): void {
    const questionId = question['_id'] as string;
    const fullQuestion = this.questions().find((q) => q._id === questionId);

    if (!fullQuestion) {
      this.notifications.danger(
        'Question not found',
        'Could not load question details'
      );
      return;
    }

    this.sidebarQuestion = fullQuestion;
    this.isSidebarOpen = true;
  }

  protected closeSidebar(): void {
    this.isSidebarOpen = false;
    this.sidebarQuestion = undefined;
  }

  protected get sidebarFields(): SidebarField[] {
    if (!this.sidebarQuestion) return [];
    return [
      {
        label: 'Question',
        key: 'question',
        type: 'text',
      },
      {
        label: 'Domain',
        key: 'domain',
        type: 'text',
        format: () => this.sidebarQuestion?.domain?.title || '—',
      },
      {
        label: 'Status',
        key: 'isActive',
        type: 'badge',
        badgeClassKey: 'statusClass',
        format: () => (this.sidebarQuestion?.isActive ? 'Active' : 'Inactive'),
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
    if (!this.sidebarQuestion) return {};
    return {
      ...this.sidebarQuestion,
      statusClass: this.sidebarQuestion.isActive ? 'success' : 'warning',
      isActive: this.sidebarQuestion.isActive ? 'Active' : 'Inactive',
    };
  }

  protected onUpdate(question: Record<string, unknown>): void {
    const questionId = question['_id'] as string;
    const fullQuestion = this.questions().find((q) => q._id === questionId);

    if (!fullQuestion) {
      this.notifications.danger(
        'Question not found',
        'Could not load question details for editing'
      );
      return;
    }

    this.selectedQuestion = fullQuestion;
    this.isDialogOpen = true;

    this.questionForm.patchValue({
      question: fullQuestion.question,
      domain: fullQuestion.domain._id,
      isActive: fullQuestion.isActive,
    });
  }

  protected onDelete(question: Record<string, unknown>): void {
    const questionId = question['_id'] as string;
    const fullQuestion = this.questions().find((q) => q._id === questionId);

    if (!fullQuestion) {
      this.notifications.danger(
        'Question not found',
        'Could not find question to delete'
      );
      return;
    }

    this.questionToDelete = fullQuestion;
    this.isDeleteDialogOpen = true;
  }

  protected closeDeleteDialog() {
    if (this.deleteDialogLoading()) {
      return;
    }
    this.isDeleteDialogOpen = false;
    this.questionToDelete = undefined;
    this.deleteDialogLoading.set(false);
  }

  protected confirmDelete() {
    if (!this.questionToDelete?._id || this.deleteDialogLoading()) {
      return;
    }

    this.deleteDialogLoading.set(true);
    this.tableLoading.set(true);
    this.questionService
      .delete(this.questionToDelete._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleteDialogLoading.set(false);
          this.closeDeleteDialog();
          this.loadQuestions(
            this.currentPage,
            this.currentLimit,
            this.currentSearch,
            this.sortBy,
            this.sortDirection,
            this.currentFilters
          );

          this.notifications.success(
            'Question deleted',
            `Question has been deleted successfully`
          );
        },
        error: (error) => {
          console.error('Error deleting question:', error);
          this.deleteDialogLoading.set(false);
          this.notifications.danger(
            error.error?.message ||
              'An error occurred while deleting the question',
            'Failed to delete question'
          );
          this.tableLoading.set(false);
        },
      });
  }
}

