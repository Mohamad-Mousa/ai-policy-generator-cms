import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '@shared/services';
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
export class PolicyCmsComponent implements OnInit {
  protected activeTab: 'generator' | 'library' | 'initiativeLibrary' = 'generator';

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
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

  protected setActiveTab(
    tab: 'generator' | 'library' | 'initiativeLibrary'
  ): void {
    this.activeTab = tab;
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


