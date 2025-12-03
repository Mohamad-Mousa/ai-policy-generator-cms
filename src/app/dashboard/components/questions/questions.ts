import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
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
      label: 'Type',
      key: 'type',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { label: 'Text', value: 'text' },
        { label: 'Radio', value: 'radio' },
        { label: 'Checkbox', value: 'checkbox' },
        { label: 'Number', value: 'number' },
      ],
      sortable: true,
    },
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

  protected readonly questionTypes = [
    { label: 'Text', value: 'text' },
    { label: 'Radio', value: 'radio' },
    { label: 'Checkbox', value: 'checkbox' },
    { label: 'Number', value: 'number' },
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

  protected get currentPageValue(): number {
    return this.currentPage;
  }

  protected get currentLimitValue(): number {
    return this.currentLimit;
  }

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
      type: ['text', [Validators.required]],
      domain: ['', [Validators.required]],
      answers: this.fb.array([]),
      min: [null],
      max: [null],
      isActive: [true],
    });

    // Watch for type changes to update form validation
    this.questionForm.get('type')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        this.onTypeChange(type);
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
    const typeLabels: Record<string, string> = {
      text: 'Text',
      radio: 'Radio',
      checkbox: 'Checkbox',
      number: 'Number',
    };
    return {
      ...question,
      statusClass: question.isActive ? 'success' : 'warning',
      isActive: question.isActive ? 'Active' : 'Inactive',
      domain: question.domain?.title || '—',
      type: typeLabels[question.type] || question.type,
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

  protected get typeControl(): FormControl {
    return this.questionForm.get('type') as FormControl;
  }

  protected get domainControl(): FormControl {
    return this.questionForm.get('domain') as FormControl;
  }

  protected get answersArray(): FormArray {
    return this.questionForm.get('answers') as FormArray;
  }

  protected get minControl(): FormControl {
    return this.questionForm.get('min') as FormControl;
  }

  protected get maxControl(): FormControl {
    return this.questionForm.get('max') as FormControl;
  }

  protected get isActiveControl(): FormControl {
    return this.questionForm.get('isActive') as FormControl;
  }

  protected get showAnswersField(): boolean {
    const type = this.typeControl?.value;
    return type === 'radio' || type === 'checkbox';
  }

  protected get showNumberFields(): boolean {
    return this.typeControl?.value === 'number';
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
      type: 'text',
      domain: '',
      isActive: true,
    });
    this.clearAnswers();
    this.clearNumberFields();
  }

  private onTypeChange(type: string): void {
    if (type === 'text') {
      this.clearAnswers();
      this.clearNumberFields();
      this.answersArray.clearValidators();
      this.minControl.clearValidators();
      this.maxControl.clearValidators();
    } else if (type === 'radio' || type === 'checkbox') {
      this.clearNumberFields();
      this.minControl.clearValidators();
      this.maxControl.clearValidators();
      if (this.answersArray.length === 0) {
        this.addAnswer();
      }
      this.answersArray.setValidators([Validators.required, Validators.minLength(1)]);
    } else if (type === 'number') {
      this.clearAnswers();
      this.answersArray.clearValidators();
      this.minControl.setValidators([Validators.required]);
      this.maxControl.setValidators([Validators.required]);
    }
    this.answersArray.updateValueAndValidity();
    this.minControl.updateValueAndValidity();
    this.maxControl.updateValueAndValidity();
  }

  private clearAnswers(): void {
    while (this.answersArray.length !== 0) {
      this.answersArray.removeAt(0);
    }
  }

  private clearNumberFields(): void {
    this.minControl.setValue(null);
    this.maxControl.setValue(null);
  }

  protected addAnswer(): void {
    const answerControl = this.fb.control('', [Validators.required]);
    this.answersArray.push(answerControl);
    // Trigger change detection to ensure form-input component picks up the new control
    this.answersArray.updateValueAndValidity();
  }

  protected removeAnswer(index: number): void {
    if (this.answersArray.length > 1 && index >= 0 && index < this.answersArray.length) {
      this.answersArray.removeAt(index);
      // Update validity after removal
      this.answersArray.updateValueAndValidity();
    }
  }

  protected getAnswerControl(index: number): FormControl {
    return this.answersArray.at(index) as FormControl;
  }

  protected onSubmit() {
    this.questionForm.markAllAsTouched();
    
    // Additional validation for number type
    const formValue = this.questionForm.value;
    if (formValue.type === 'number') {
      const min = formValue.min;
      const max = formValue.max;
      if (min !== null && max !== null && min >= max) {
        this.minControl.setErrors({ minMaxInvalid: true });
        this.maxControl.setErrors({ minMaxInvalid: true });
        this.notifications.danger(
          'Minimum value must be less than maximum value',
          'Validation Error'
        );
        return;
      }
    }

    if (this.questionForm.invalid || this.dialogLoading()) {
      return;
    }

    this.dialogLoading.set(true);
    this.tableLoading.set(true);
    const type = formValue.type;

    const questionData: CreateQuestionRequest | UpdateQuestionRequest = {
      question: formValue.question.trim(),
      type: type,
      domain: formValue.domain,
      ...(formValue.isActive !== undefined && {
        isActive: formValue.isActive ? 'true' : 'false',
      }),
    };

    // Add type-specific fields
    if (type === 'radio' || type === 'checkbox') {
      const answers = formValue.answers
        .map((answer: string) => answer?.trim())
        .filter((answer: string) => answer);
      if (answers.length > 0) {
        questionData.answers = answers;
      }
    } else if (type === 'number') {
      if (formValue.min !== null && formValue.min !== undefined) {
        questionData.min = Number(formValue.min);
      }
      if (formValue.max !== null && formValue.max !== undefined) {
        questionData.max = Number(formValue.max);
      }
    }

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
    const fields: SidebarField[] = [
      {
        label: 'Question',
        key: 'question',
        type: 'text',
      },
      {
        label: 'Type',
        key: 'type',
        type: 'text',
        format: () => {
          const typeLabels: Record<string, string> = {
            text: 'Text',
            radio: 'Radio',
            checkbox: 'Checkbox',
            number: 'Number',
          };
          return typeLabels[this.sidebarQuestion?.type || ''] || this.sidebarQuestion?.type || '—';
        },
      },
      {
        label: 'Domain',
        key: 'domain',
        type: 'text',
        format: () => this.sidebarQuestion?.domain?.title || '—',
      },
    ];

    // Add type-specific fields
    if (this.sidebarQuestion.type === 'radio' || this.sidebarQuestion.type === 'checkbox') {
      if (this.sidebarQuestion.answers && this.sidebarQuestion.answers.length > 0) {
        fields.push({
          label: 'Answers',
          key: 'answers',
          type: 'text',
          format: () => this.sidebarQuestion?.answers?.join(', ') || '—',
        });
      }
    } else if (this.sidebarQuestion.type === 'number') {
      if (this.sidebarQuestion.min !== undefined || this.sidebarQuestion.max !== undefined) {
        fields.push({
          label: 'Min',
          key: 'min',
          type: 'text',
          format: () => this.sidebarQuestion?.min?.toString() || '—',
        });
        fields.push({
          label: 'Max',
          key: 'max',
          type: 'text',
          format: () => this.sidebarQuestion?.max?.toString() || '—',
        });
      }
    }

    fields.push(
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
      }
    );

    return fields;
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

    // Clear existing form arrays
    this.clearAnswers();
    this.clearNumberFields();

    // Set type without triggering change handler to avoid interference
    this.typeControl.setValue(fullQuestion.type || 'text', { emitEvent: false });

    // Set basic fields
    this.questionForm.patchValue({
      question: fullQuestion.question,
      domain: fullQuestion.domain._id,
      isActive: fullQuestion.isActive,
    });

    // Set type-specific fields
    if (fullQuestion.type === 'radio' || fullQuestion.type === 'checkbox') {
      if (fullQuestion.answers && fullQuestion.answers.length > 0) {
        fullQuestion.answers.forEach((answer) => {
          this.addAnswer();
          const lastIndex = this.answersArray.length - 1;
          this.answersArray.at(lastIndex).setValue(answer);
        });
      } else {
        this.addAnswer();
      }
      // Set validators for answers array
      this.answersArray.setValidators([Validators.required, Validators.minLength(1)]);
      this.answersArray.updateValueAndValidity();
    } else if (fullQuestion.type === 'number') {
      this.questionForm.patchValue({
        min: fullQuestion.min ?? null,
        max: fullQuestion.max ?? null,
      });
      // Set validators for number fields
      this.minControl.setValidators([Validators.required]);
      this.maxControl.setValidators([Validators.required]);
      this.minControl.updateValueAndValidity();
      this.maxControl.updateValueAndValidity();
    }
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

