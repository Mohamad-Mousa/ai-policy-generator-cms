import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@shared/services';
import { PrivilegeAccess } from '@shared/enums';

interface NavTab {
  label: string;
  description: string;
  icon: string;
  path: string;
  absolute?: boolean;
  logout?: boolean;
  functionKey?: string;
  /** Dashboard child paths (e.g. domains) that should highlight this tab as well. */
  alsoHighlightForPaths?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected isCollapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Input() mobileOpen = false;
  @Output() mobileOpenChange = new EventEmitter<boolean>();

  protected readonly allNavTabs: NavTab[] = [
    {
      label: 'AI Readiness Assessment',
      description: 'Complete questionnaires and provide evidence per factor',
      path: 'ai-readiness-assessment',
      icon: 'assessment',
      alsoHighlightForPaths: ['domains', 'subdomains'],
    },
    {
      label: 'Policy Generator',
      description:
        'Generate customized AI policies based on readiness findings',
      path: 'policy-generator',
      icon: 'auto_awesome',
    },
    {
      label: 'Admin',
      description: 'Manage admins, roles, logs, and settings',
      path: 'admin',
      icon: 'admin_panel_settings',
      functionKey: 'admins',
    },
  ];

  protected get navTabs(): NavTab[] {
    return this.allNavTabs.filter((tab) => {
      if (tab.functionKey) {
        return this.authService.hasPrivilege(
          tab.functionKey,
          PrivilegeAccess.R
        );
      }
      return true;
    });
  }

  constructor(private router: Router, private authService: AuthService) {}

  protected navTileActive(tab: NavTab, rla: { isActive: boolean }): boolean {
    if (rla.isActive) {
      return true;
    }
    const extras = tab.alsoHighlightForPaths;
    if (!extras?.length) {
      return false;
    }
    const url = this.router.url.split('?')[0];
    return extras.some((segment) => url === `/dashboard/${segment}`);
  }

  protected toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  protected closeMobilePanel() {
    if (this.mobileOpen) {
      this.mobileOpenChange.emit(false);
    }
  }

  protected handleNavSelection() {
    this.closeMobilePanel();
  }
}
