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
      description: 'Complete questionnaires and provide evidence per domain',
      path: 'ai-readiness-assessment',
      icon: 'assessment',
    },
    {
      label: 'Readiness Reports',
      description: 'View per-domain scores, gap analysis, and recommendations',
      path: 'readiness-reports',
      icon: 'analytics',
    },
    {
      label: 'Policy Generator',
      description:
        'Generate customized AI policies based on readiness findings',
      path: 'policy-generator',
      icon: 'auto_awesome',
    },
    {
      label: 'Policy Library',
      description: 'View, manage, and export generated AI policies',
      path: 'policy-library',
      icon: 'folder_special',
    },
    {
      label: 'Domains',
      description: 'Manage and configure domains',
      path: 'domains',
      icon: 'category',
      functionKey: 'domains',
    },
    {
      label: 'Questions',
      description: 'Manage assessment questions',
      path: 'questions',
      icon: 'quiz',
      functionKey: 'questions',
    },
    {
      label: 'Admins',
      description: 'View and onboard new admins',
      path: 'admins',
      icon: 'groups',
      functionKey: 'admins',
    },
    {
      label: 'Admin Types',
      description: 'Configure policies by role',
      path: 'admin-types',
      icon: 'badge',
      functionKey: 'adminTypes',
    },
    {
      label: 'Activity Logs',
      description: 'View system activity and audit trail',
      path: 'activity-logs',
      icon: 'history',
      functionKey: 'userLogs',
    },
    {
      label: 'Settings',
      description: 'Audit logs and preferences',
      path: 'settings',
      icon: 'settings',
      functionKey: 'settings',
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
