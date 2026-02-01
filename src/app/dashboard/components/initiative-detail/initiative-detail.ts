import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { InitiativeService } from '@shared/services';
import { Initiative } from '@shared/interfaces';
import { NotificationService } from '@shared/components/notification/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-initiative-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './initiative-detail.html',
  styleUrl: './initiative-detail.scss',
})
export class InitiativeDetailComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  protected initiative = signal<Initiative | null>(null);
  protected isLoading = signal(true);
  protected errorMessage = signal<string | null>(null);
  protected safeOverview = signal<SafeHtml | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private initiativeService: InitiativeService,
    private notifications: NotificationService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('Initiative ID is missing.');
      this.isLoading.set(false);
      return;
    }
    this.loadInitiative(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitiative(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.initiativeService
      .findOne(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.initiative.set(data);
          if (data.overview) {
            this.safeOverview.set(
              this.sanitizer.bypassSecurityTrustHtml(data.overview)
            );
          } else {
            this.safeOverview.set(null);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            error.error?.message ?? 'Unable to load initiative details.'
          );
          this.notifications.danger(
            error.error?.message ?? 'Unable to load initiative details.',
            'Error'
          );
        },
      });
  }

  protected goBack(): void {
    this.router.navigate(['/dashboard/policy-generator']);
  }

  protected getTitle(initiative: Initiative): string {
    return initiative.englishName ?? initiative.description?.slice(0, 80) ?? 'Initiative';
  }
}
