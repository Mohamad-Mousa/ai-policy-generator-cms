import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent } from '@shared/components/button/button';
import { Domain } from '@shared/interfaces';
import { DomainService } from '@shared/services';
import { NotificationService } from '@shared/components/notification/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PolicyContext {
  sector: string;
  organizationSize: string;
  riskAppetite: string;
  timeline: string;
}

interface PolicySection {
  id: string;
  title: string;
  content: string;
  rationale: string;
  references: string[];
}

@Component({
  selector: 'app-policy-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './policy-generator.html',
  styleUrl: './policy-generator.scss',
})
export class PolicyGeneratorComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  protected policyContext: PolicyContext = {
    sector: '',
    organizationSize: '',
    riskAppetite: '',
    timeline: '',
  };

  protected domains = signal<Domain[]>([]);
  protected selectedDomainId = '';
  protected isLoadingDomains = signal(false);

  protected policySections = signal<PolicySection[]>([]);
  protected executiveSummary = signal('');
  protected isGenerating = signal(false);
  protected isGenerated = signal(false);
  protected showPreview = signal(false);

  protected readonly sectorOptions = [
    'Government',
    'Healthcare',
    'Finance',
    'Education',
    'Technology',
    'Manufacturing',
    'Other',
  ];

  protected readonly sizeOptions = [
    'Small (< 50 employees)',
    'Medium (50-500 employees)',
    'Large (500-5000 employees)',
    'Enterprise (> 5000 employees)',
  ];

  protected readonly riskAppetiteOptions = [
    'Conservative',
    'Moderate',
    'Aggressive',
  ];

  protected readonly timelineOptions = [
    'Immediate (0-3 months)',
    'Short-term (3-6 months)',
    'Medium-term (6-12 months)',
    'Long-term (12+ months)',
  ];

  protected readonly selectedDomain = computed(() =>
    this.domains().find((domain) => domain._id === this.selectedDomainId)
  );

  constructor(
    private domainService: DomainService,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadDomains();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected generatePolicy() {
    if (!this.isFormValid()) {
      return;
    }

    this.isGenerating.set(true);
    this.isGenerated.set(false);

    setTimeout(() => {
      const domainLabel = this.selectedDomain()?.title || 'selected domain';

      this.executiveSummary.set(
        `This AI policy has been tailored for a ${this.policyContext.organizationSize.toLowerCase()} organization in the ${
          this.policyContext.sector
        } sector with a ${this.policyContext.riskAppetite.toLowerCase()} risk appetite. The policy addresses key AI governance, ethics, and compliance requirements based on international best practices and regulatory frameworks. Guidance and controls are scoped specifically for the ${domainLabel} domain to maintain strategic alignment.`
      );

      this.policySections.set([
        {
          id: '1',
          title: 'Introduction and Scope',
          content: `This policy establishes guidelines for the development, deployment, and use of artificial intelligence systems within the organization, with scope limited to initiatives related to the ${domainLabel} domain...`,
          rationale: 'Based on EU AI Act and OECD AI Principles',
          references: ['EU AI Act (2024)', 'OECD AI Principles (2019)'],
        },
        {
          id: '2',
          title: 'AI Governance Framework',
          content: `The organization shall establish an AI governance committee responsible for overseeing AI initiatives connected to the ${domainLabel} domain, ensuring continuous compliance and performance monitoring...`,
          rationale: 'Aligned with ISO/IEC 23053:2022 framework',
          references: [
            'ISO/IEC 23053:2022',
            'NIST AI Risk Management Framework',
          ],
        },
      ]);

      this.isGenerating.set(false);
      this.isGenerated.set(true);
      this.showPreview.set(true);
    }, 2000);
  }

  protected isFormValid(): boolean {
    return !!(
      this.selectedDomainId &&
      this.policyContext.sector &&
      this.policyContext.organizationSize &&
      this.policyContext.riskAppetite &&
      this.policyContext.timeline
    );
  }

  savePolicy() {
    console.log('Saving policy for domain:', this.selectedDomainId);
  }

  exportPolicy(format: 'pdf' | 'docx') {
    console.log(`Exporting policy as ${format}`);
  }

  protected resetForm() {
    this.policyContext = {
      sector: '',
      organizationSize: '',
      riskAppetite: '',
      timeline: '',
    };
    this.selectedDomainId = '';
    this.policySections.set([]);
    this.executiveSummary.set('');
    this.isGenerated.set(false);
    this.showPreview.set(false);
  }

  protected editContext(): void {
    this.showPreview.set(false);
  }

  protected loadDomains(): void {
    this.isLoadingDomains.set(true);
    this.domainService
      .findMany(1, 50, undefined, undefined, undefined, { isActive: 'true' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.domains.set(response.data);
          this.isLoadingDomains.set(false);
        },
        error: (error) => {
          this.isLoadingDomains.set(false);
          console.error('Failed to load domains', error);
          this.notifications.danger(
            error.error?.message ||
              'Unable to load domains. Please try again later.',
            'Domain fetch failed'
          );
        },
      });
  }
}
