import { Component, OnDestroy, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button';
import { LoaderComponent } from '@shared/components/loader/loader';
import { PrivilegeAccess } from '@shared/enums';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Domain, domainScoreOrZero } from '@shared/interfaces';
import { AuthService, DomainService, AssessmentService } from '@shared/services';
import { NotificationService } from '@shared/components/notification/notification.service';
import { publicAssessmentShareUrl } from '@shared/utils/public-assessment-share-url';

interface DomainCard {
  id: string;
  title: string;
  description: string;
  icon?: string;
  completed: boolean;
  progress: number;
  scoreAvg: number;
  scorePercentage: number;
  payload: Domain;
}

@Component({
  selector: 'app-ai-readiness-assessment',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LoaderComponent],
  templateUrl: './ai-readiness-assessment.html',
  styleUrl: './ai-readiness-assessment.scss',
})
export class AIReadinessAssessmentComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  protected domains = signal<DomainCard[]>([]);
  protected selectedDomain = signal<DomainCard | null>(null);
  protected isLoading = signal(false);
  protected isDownloadingTemplate = signal(false);
  protected isImporting = signal(false);
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  protected readonly functionKey = 'questions';
  protected readonly domainsFunctionKey = 'domains';
  protected readonly policiesFunctionKey = 'policies';
  protected readonly writePrivilege = PrivilegeAccess.W;
  protected readonly readPrivilege = PrivilegeAccess.R;
  protected readonly policiesWritePrivilege = PrivilegeAccess.W;

  constructor(
    private router: Router,
    private authService: AuthService,
    private domainService: DomainService,
    private assessmentService: AssessmentService,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadDomains();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected hasDomainsAccess(): boolean {
    return this.authService.hasPrivilege(
      this.domainsFunctionKey,
      PrivilegeAccess.R
    );
  }

  protected hasPolicyGeneratorAccess(): boolean {
    return this.authService.hasPrivilege(
      this.policiesFunctionKey,
      PrivilegeAccess.W
    );
  }

  protected goToPolicyGenerator(): void {
    this.router.navigate(['/dashboard/policy-generator'], {
      state: { policyGeneratorReset: true },
    });
  }

  protected goToDomains() {
    this.router.navigate(['/dashboard/domains']);
  }

  protected selectDomain(domain: DomainCard) {
    const currentSelection = this.selectedDomain();
    if (currentSelection?.id === domain.id) {
      this.selectedDomain.set(null);
      return;
    }
    this.selectedDomain.set(domain);
  }

  protected copyPublicShareLink(event: MouseEvent, domain: DomainCard): void {
    event.stopPropagation();
    void this.copyPublicAssessmentShareLink(domain.id);
  }

  private async copyPublicAssessmentShareLink(domainId: string): Promise<void> {
    const url = publicAssessmentShareUrl(domainId);
    try {
      await navigator.clipboard.writeText(url);
      this.notifications.success(
        'Respondents can open this link without signing in.',
        'Public link copied'
      );
    } catch {
      this.notifications.warning(
        url,
        'Copy blocked — copy the link from this message'
      );
    }
  }

  protected startNewAssessment() {
    const domain = this.selectedDomain();
    if (!domain) {
      this.notifications.info(
        'Please select a domain before starting a new assessment.',
        'Domain required'
      );
      return;
    }

    this.router.navigate(['/dashboard/assessment'], {
      state: {
        domain: domain.payload,
      },
    });
  }

  protected viewAssessments() {
    const domain = this.selectedDomain();
    if (!domain) {
      this.notifications.info(
        'Please select a domain to view assessments.',
        'Domain required'
      );
      return;
    }

    this.router.navigate(['/dashboard/readiness-reports'], {
      state: {
        domain: domain.payload,
      },
    });
  }

  private loadDomains() {
    this.isLoading.set(true);
    this.domainService
      .findMany(1, 10, undefined, undefined, undefined, { isActive: 'true' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          const mappedDomains = response.data.map((domain) =>
            this.mapDomain(domain)
          );
          this.domains.set(mappedDomains);

          if (!mappedDomains.length) {
            this.selectedDomain.set(null);
            return;
          }

          const currentSelection = this.selectedDomain();
          if (currentSelection) {
            const updatedSelection =
              mappedDomains.find((d) => d.id === currentSelection.id) || null;
            this.selectedDomain.set(updatedSelection);
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('Failed to load domains', error);
          this.domains.set([]);
          this.selectedDomain.set(null);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load AI readiness domains. Please try again.',
            'Domain fetch failed'
          );
        },
      });
  }

  private mapDomain(domain: Domain): DomainCard {
    const scorePercentage = domainScoreOrZero(domain.scorePercentage);
    return {
      id: domain._id,
      title: domain.title,
      description: domain.description,
      icon: domain.icon || 'category',
      completed: false,
      progress: Math.min(100, Math.max(0, scorePercentage)),
      scoreAvg: domainScoreOrZero(domain.scoreAvg),
      scorePercentage,
      payload: domain,
    };
  }

  protected downloadTemplate() {
    const domain = this.selectedDomain();
    if (!domain) {
      this.notifications.info(
        'Please select a domain before downloading the template.',
        'Domain required'
      );
      return;
    }

    this.isDownloadingTemplate.set(true);
    this.assessmentService
      .downloadTemplate(domain.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.isDownloadingTemplate.set(false);
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `assessment-template-${domain.title.replace(/\s+/g, '-').toLowerCase()}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          this.notifications.success(
            'Template downloaded successfully.',
            'Download complete'
          );
        },
        error: (error) => {
          this.isDownloadingTemplate.set(false);
          console.error('Failed to download template', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to download template. Please try again.',
            'Download failed'
          );
        },
      });
  }

  protected triggerFileInput() {
    this.fileInput?.nativeElement.click();
  }

  protected onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      const validExtensions = ['.xlsx', '.xls'];
      const fileName = file.name.toLowerCase();
      const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!isValidFile) {
        this.notifications.danger(
          'Please select a valid Excel file (.xlsx or .xls).',
          'Invalid file type'
        );
        input.value = '';
        return;
      }

      this.importFile(file);
      input.value = '';
    }
  }

  private importFile(file: File) {
    this.isImporting.set(true);
    this.assessmentService
      .import(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.isImporting.set(false);
          const successCount = results.success?.length || 0;
          const errorCount = results.errors?.length || 0;
          const total = results.total || 0;

          if (errorCount === 0) {
            this.notifications.success(
              `Successfully imported ${successCount} assessment(s).`,
              'Import complete'
            );
          } else if (successCount > 0) {
            this.notifications.warning(
              `Imported ${successCount} assessment(s) with ${errorCount} error(s). Please check the details.`,
              'Import completed with errors'
            );
          } else {
            this.notifications.danger(
              `Failed to import assessments. ${errorCount} error(s) occurred.`,
              'Import failed'
            );
          }

          // Reload domains to refresh any progress indicators
          this.loadDomains();
        },
        error: (error) => {
          this.isImporting.set(false);
          console.error('Failed to import file', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to import file. Please check the file format and try again.',
            'Import failed'
          );
        },
      });
  }
}
