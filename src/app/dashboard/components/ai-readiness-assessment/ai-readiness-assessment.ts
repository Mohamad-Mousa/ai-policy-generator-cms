import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button';
import { LoaderComponent } from '@shared/components/loader/loader';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Domain } from '@shared/interfaces';
import { DomainService } from '@shared/services';
import { NotificationService } from '@shared/components/notification/notification.service';

interface DomainCard {
  id: string;
  title: string;
  description: string;
  icon?: string;
  completed: boolean;
  progress: number;
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

  constructor(
    private router: Router,
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

  protected selectDomain(domain: DomainCard) {
    const currentSelection = this.selectedDomain();
    if (currentSelection?.id === domain.id) {
      this.selectedDomain.set(null);
      return;
    }
    this.selectedDomain.set(domain);
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
    return {
      id: domain._id,
      title: domain.title,
      description: domain.description,
      icon: domain.icon || 'category',
      completed: false,
      progress: 0,
      payload: domain,
    };
  }
}
