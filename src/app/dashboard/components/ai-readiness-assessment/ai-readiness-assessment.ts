import {
  Component,
  computed,
  HostListener,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
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
import {
  publicAssessmentShareUrl,
  publicMultiAssessmentShareUrl,
} from '@shared/utils/public-assessment-share-url';

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

/** Readiness score % tiers: five 20% bands (rd0 = 0–19 … rd4 = 80–100). */
type ReadinessScoreTier = 'rd0' | 'rd1' | 'rd2' | 'rd3' | 'rd4';

@Component({
  selector: 'app-ai-readiness-assessment',
  standalone: true,
  imports: [CommonModule, ButtonComponent, LoaderComponent],
  templateUrl: './ai-readiness-assessment.html',
  styleUrl: './ai-readiness-assessment.scss',
})
export class AIReadinessAssessmentComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  /** Load enough active domains for the grid and for “share all public link”. */
  private readonly activeDomainsFetchLimit = 500;
  protected domains = signal<DomainCard[]>([]);
  protected selectedDomain = signal<DomainCard | null>(null);
  protected isLoading = signal(false);
  /** While a template download is in progress, the domain id being downloaded (for row loading state). */
  protected downloadingTemplateDomainId = signal<string | null>(null);
  protected isImporting = signal(false);
  /** Domain card that opened the import file picker (for menu loading state). */
  protected importTriggerDomainId = signal<string | null>(null);
  /** Which domain card’s ⋮ menu is open (at most one). */
  protected domainCardMenuOpenId = signal<string | null>(null);
  /** Set when the domain list response includes overall score fields. */
  protected overallScoresFromApi = signal(false);
  protected overallScoreAvg = signal(0);
  protected overallScorePercentage = signal(0);
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('newAssessmentDropdownRoot')
  private newAssessmentDropdownRoot?: ElementRef<HTMLElement>;
  /** Domain picker opened from the header New Assessment control. */
  protected newAssessmentMenuOpen = signal(false);

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

  protected canReadQuestionsTools(): boolean {
    return this.authService.hasPrivilege(this.functionKey, PrivilegeAccess.R);
  }

  protected canWriteQuestionsTools(): boolean {
    return this.authService.hasPrivilege(this.functionKey, PrivilegeAccess.W);
  }

  protected goToPolicyGenerator(): void {
    this.router.navigate(['/dashboard/policy-generator'], {
      state: { policyGeneratorReset: true },
    });
  }

  protected goToDomains() {
    this.router.navigate(['/dashboard/domains']);
  }

  protected copyPublicShareLink(event: MouseEvent, domain: DomainCard): void {
    event.stopPropagation();
    void this.copyPublicAssessmentShareLink(domain.id);
  }

  protected onShareLinkFromMenu(event: MouseEvent, domain: DomainCard): void {
    this.domainCardMenuOpenId.set(null);
    this.copyPublicShareLink(event, domain);
  }

  private async copyPublicAssessmentShareLink(domainId: string): Promise<void> {
    await this.copyUrlToClipboard(
      publicAssessmentShareUrl(domainId),
      'Respondents can open this link without signing in.',
    );
  }

  protected copyAllPublicShareLink(): void {
    const ids = this.domains().map((d) => d.id);
    const url = publicMultiAssessmentShareUrl(ids);
    if (!url) {
      this.notifications.warning(
        'No factors are available to build a link.',
        'Nothing to share',
      );
      return;
    }
    void this.copyUrlToClipboard(
      url,
      'Multi-factor public link copied. Respondents choose and complete assessments in one flow.',
    );
  }

  private async copyUrlToClipboard(
    url: string,
    successDetail: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.notifications.success(successDetail, 'Link copied');
    } catch {
      this.notifications.warning(
        url,
        'Copy blocked — copy the link from this message',
      );
    }
  }

  protected toggleNewAssessmentMenu(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isLoading() || !this.domains().length) {
      return;
    }
    this.newAssessmentMenuOpen.update((open) => !open);
  }

  protected onPickDomainForNewAssessment(domain: DomainCard): void {
    this.newAssessmentMenuOpen.set(false);
    this.selectedDomain.set(domain);
    this.navigateToAssessmentForDomain(domain);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClickCloseMenus(event: MouseEvent): void {
    const target = event.target as Node;
    if (this.newAssessmentMenuOpen()) {
      const root = this.newAssessmentDropdownRoot?.nativeElement;
      if (root && !root.contains(target)) {
        this.newAssessmentMenuOpen.set(false);
      }
    }
    const openCardMenuId = this.domainCardMenuOpenId();
    if (openCardMenuId !== null) {
      const menuEl = document.querySelector(
        `[data-domain-menu="${CSS.escape(openCardMenuId)}"]`,
      );
      if (menuEl && !menuEl.contains(target)) {
        this.domainCardMenuOpenId.set(null);
      }
    }
  }

  protected toggleDomainCardMenu(event: MouseEvent, domainId: string): void {
    event.stopPropagation();
    this.domainCardMenuOpenId.update((id) => (id === domainId ? null : domainId));
  }

  /** Open readiness reports for the domain highlighted in the summary row. */
  protected goToReadinessReportsForDomain(domain: DomainCard): void {
    this.router.navigate(['/dashboard/readiness-reports'], {
      state: { domain: domain.payload },
    });
  }

  private navigateToAssessmentForDomain(domain: DomainCard): void {
    this.router.navigate(['/dashboard/assessment'], {
      state: { domain: domain.payload },
    });
  }

  /** Both scores zero → prompt to start; otherwise show reports. */
  protected domainHasNoScores(domain: DomainCard): boolean {
    return domain.scoreAvg === 0 && domain.scorePercentage === 0;
  }

  protected onStartAssessmentForDomain(event: MouseEvent, domain: DomainCard): void {
    event.stopPropagation();
    this.navigateToAssessmentForDomain(domain);
  }

  protected onViewAssessmentsForDomain(event: MouseEvent, domain: DomainCard): void {
    event.stopPropagation();
    this.domainCardMenuOpenId.set(null);
    this.router.navigate(['/dashboard/readiness-reports'], {
      state: { domain: domain.payload },
    });
  }

  protected onDownloadTemplateForDomain(event: MouseEvent, domain: DomainCard): void {
    event.stopPropagation();
    this.domainCardMenuOpenId.set(null);
    this.downloadTemplateForDomain(domain);
  }

  protected onImportFileForDomain(event: MouseEvent, domain: DomainCard): void {
    event.stopPropagation();
    this.domainCardMenuOpenId.set(null);
    this.selectedDomain.set(domain);
    this.importTriggerDomainId.set(domain.id);
    this.fileInput?.nativeElement.click();
  }

  /** Score % used for readiness bar (0–100). */
  protected readinessPercent(domain: DomainCard): number {
    return Math.min(100, Math.max(0, Math.round(domain.scorePercentage)));
  }

  /**
   * Readiness % tier: five 20% bands (0–19 … 80–100), same as score % rings and legend.
   */
  protected readinessBand(
    domain: DomainCard,
  ): ReadinessScoreTier {
    return this.readinessPercentScoreBand(this.readinessPercent(domain));
  }

  /** Show “Continue” when there are scores and readiness is in the middle bands (20–79%). */
  protected showContinueAssessmentCta(domain: DomainCard): boolean {
    if (this.domainHasNoScores(domain)) {
      return false;
    }
    const p = this.readinessPercent(domain);
    return p >= 20 && p < 80;
  }

  /**
   * Domain with the highest readiness % (API score). Tie-break: first in list order.
   */
  protected readonly highestReadinessDomain = computed((): DomainCard | null => {
    const list = this.domains();
    if (list.length === 0) {
      return null;
    }
    let best = list[0];
    let bestP = this.readinessPercent(best);
    for (let i = 1; i < list.length; i++) {
      const d = list[i];
      const p = this.readinessPercent(d);
      if (p > bestP) {
        best = d;
        bestP = p;
      }
    }
    return best;
  });

  protected readinessBandLabel(domain: DomainCard): string {
    switch (this.readinessBand(domain)) {
      case 'rd0':
        return 'needs attention';
      case 'rd1':
        return 'early progress';
      case 'rd2':
        return 'in progress';
      case 'rd3':
        return 'advancing';
      case 'rd4':
        return 'ready';
    }
  }

  /** Fill width for average score on a 1–5 scale (0–100%). */
  protected scoreAvgMeterPercent(domain: DomainCard): number {
    const raw = (domain.scoreAvg / 5) * 100;
    return Math.min(100, Math.max(0, raw));
  }

  /** Fill width 0–100% from average on 1–5 scale (integer % for ring progress). */
  protected overallScoreAvgMeterPercentRounded(): number {
    const raw = (this.overallScoreAvg() / 5) * 100;
    return Math.min(100, Math.max(0, Math.round(raw)));
  }

  /** SVG circle r=40 in 100×100 viewBox. */
  protected readonly overallRingCircumference = 2 * Math.PI * 40;

  /** Stroke offset so the arc shows `overallScoreAvgMeterPercentRounded()`% of the ring. */
  protected overallRingDashOffset(): number {
    const p = this.overallScoreAvgMeterPercentRounded() / 100;
    return this.overallRingCircumference * (1 - p);
  }

  /** Stroke offset for readiness ring (0–100% API score), same geometry as `overallRingCircumference`. */
  protected overallReadinessRingDashOffset(): number {
    const p = this.overallReadinessPercent() / 100;
    return this.overallRingCircumference * (1 - p);
  }

  /** Small highest-domain summary ring: same SVG r=40 as overall readiness ring. */
  protected highestDomainReadinessRingDashOffset(domain: DomainCard): number {
    const p = this.readinessPercent(domain) / 100;
    return this.overallRingCircumference * (1 - p);
  }

  /**
   * Five 20% tiers (0–19 … 80–100): shared by 1–5 average, readiness % rings, and card bars.
   */
  private tierColorFromRoundedPercent(p: number): string {
    const x = Math.min(100, Math.max(0, Math.round(p)));
    if (x < 20) {
      return '#E02020';
    }
    if (x < 40) {
      return '#F0952A';
    }
    if (x < 60) {
      return '#F7E07A';
    }
    if (x < 80) {
      return '#A8C837';
    }
    return '#3CBB1A';
  }

  /** Solid stroke for overall (1–5) ring. */
  protected overallScoreAvgRingStrokeColor(): string {
    return this.tierColorFromRoundedPercent(
      this.overallScoreAvgMeterPercentRounded(),
    );
  }

  /** Readiness % ring stroke (overall and highest-factor summary). */
  protected readinessRingStrokeColor(percent: number): string {
    return this.tierColorFromRoundedPercent(percent);
  }

  /** Card average bar fill. */
  protected scoreAvgMeterBarColor(domain: DomainCard): string {
    return this.tierColorFromRoundedPercent(this.scoreAvgMeterPercent(domain));
  }

  /** Overall readiness score % from API (0–100), same basis as domain readiness bars. */
  protected overallReadinessPercent(): number {
    return Math.min(
      100,
      Math.max(0, Math.round(this.overallScorePercentage())),
    );
  }

  protected readinessPercentScoreBand(percent: number): ReadinessScoreTier {
    const p = Math.min(100, Math.max(0, Math.round(percent)));
    if (p < 20) {
      return 'rd0';
    }
    if (p < 40) {
      return 'rd1';
    }
    if (p < 60) {
      return 'rd2';
    }
    if (p < 80) {
      return 'rd3';
    }
    return 'rd4';
  }

  private loadDomains() {
    this.isLoading.set(true);
    this.domainService
      .findMany(
        1,
        this.activeDomainsFetchLimit,
        undefined,
        undefined,
        undefined,
        { isActive: 'true' },
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.overallScoresFromApi.set(
            response.overallScoreAvg !== undefined,
          );
          this.overallScoreAvg.set(
            domainScoreOrZero(response.overallScoreAvg),
          );
          this.overallScorePercentage.set(
            domainScoreOrZero(response.overallScorePercentage),
          );

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
          this.overallScoresFromApi.set(false);
          this.overallScoreAvg.set(0);
          this.overallScorePercentage.set(0);
          console.error('Failed to load domains', error);
          this.domains.set([]);
          this.selectedDomain.set(null);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load AI readiness factors. Please try again.',
            'Factor fetch failed'
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

  private downloadTemplateForDomain(domain: DomainCard): void {
    this.downloadingTemplateDomainId.set(domain.id);
    this.assessmentService
      .downloadTemplate(domain.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          this.downloadingTemplateDomainId.set(null);
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
          this.downloadingTemplateDomainId.set(null);
          console.error('Failed to download template', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to download template. Please try again.',
            'Download failed'
          );
        },
      });
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
        this.importTriggerDomainId.set(null);
        this.notifications.danger(
          'Please select a valid Excel file (.xlsx or .xls).',
          'Invalid file type'
        );
        input.value = '';
        return;
      }

      this.importFile(file);
      input.value = '';
    } else {
      this.importTriggerDomainId.set(null);
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
          this.importTriggerDomainId.set(null);
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
          this.importTriggerDomainId.set(null);
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
