import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthService, PolicyCreatedService } from '@shared/services';
import { PrivilegeAccess } from '@shared/enums';
import { PolicyGeneratorComponent } from '../policy-generator/policy-generator';
import { PolicyLibraryComponent } from '../policy-library/policy-library';

@Component({
  selector: 'app-policy-cms',
  standalone: true,
  imports: [
    CommonModule,
    PolicyGeneratorComponent,
    PolicyLibraryComponent,
  ],
  templateUrl: './policy-cms.html',
  styleUrl: './policy-cms.scss',
})
export class PolicyCmsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  protected activeTab: 'generator' | 'library' | 'initiativeLibrary' = 'generator';

  constructor(
    private router: Router,
    private authService: AuthService,
    private policyCreatedService: PolicyCreatedService
  ) {}

  ngOnInit(): void {
    this.updateActiveTabFromUrl();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.updateActiveTabFromUrl());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Set active tab from current URL path (no query params). */
  private updateActiveTabFromUrl(): void {
    const url = this.router.url;
    if (url.includes('initiative-library') && this.canViewLibrary()) {
      this.activeTab = 'initiativeLibrary';
    } else if (url.includes('policy-library') && this.canViewLibrary()) {
      this.activeTab = 'library';
    } else if (this.canViewGenerator()) {
      this.activeTab = 'generator';
    } else if (this.canViewLibrary()) {
      this.activeTab = 'library';
    }
  }

  /** User clicked a tab: clear created-policy state so list shows, then navigate by URL. */
  protected setActiveTab(
    tab: 'generator' | 'library' | 'initiativeLibrary'
  ): void {
    this.policyCreatedService.clearCreatedPolicy();
    this.activeTab = tab;
    const path =
      tab === 'library'
        ? '/dashboard/policy-library'
        : tab === 'initiativeLibrary'
          ? '/dashboard/initiative-library'
          : '/dashboard/policy-generator';
    this.router.navigateByUrl(path);
  }

  protected canViewGenerator(): boolean {
    // Generating policies requires write access
    return this.authService.hasPrivilege('policies', PrivilegeAccess.W);
  }

  protected canViewLibrary(): boolean {
    // Viewing library requires read access
    return this.authService.hasPrivilege('policies', PrivilegeAccess.R);
  }
}


