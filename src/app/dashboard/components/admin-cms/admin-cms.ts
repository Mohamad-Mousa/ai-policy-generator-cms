import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@shared/services';
import { PrivilegeAccess } from '@shared/enums';
import { AdminsComponent } from '../admins/admins';
import { AdminTypesComponent } from '../admin-types/admin-types';
import { ActivityLogsComponent } from '../activity-logs/activity-logs';
import { SettingsComponent } from '../settings/settings';

@Component({
  selector: 'app-admin-cms',
  standalone: true,
  imports: [
    CommonModule,
    AdminsComponent,
    AdminTypesComponent,
    ActivityLogsComponent,
    SettingsComponent,
  ],
  templateUrl: './admin-cms.html',
  styleUrl: './admin-cms.scss',
})
export class AdminCmsComponent implements OnInit {
  protected activeTab: 'admins' | 'adminTypes' | 'activityLogs' | 'settings' =
    'admins';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Initialize the active tab to the first tab the user can actually view
    if (this.canViewAdmins()) {
      this.activeTab = 'admins';
    } else if (this.canViewAdminTypes()) {
      this.activeTab = 'adminTypes';
    } else if (this.canViewActivityLogs()) {
      this.activeTab = 'activityLogs';
    } else if (this.canViewSettings()) {
      this.activeTab = 'settings';
    }
  }

  protected setActiveTab(
    tab: 'admins' | 'adminTypes' | 'activityLogs' | 'settings'
  ): void {
    this.activeTab = tab;
  }

  protected canViewAdmins(): boolean {
    return this.authService.hasPrivilege('admins', PrivilegeAccess.R);
  }

  protected canViewAdminTypes(): boolean {
    return this.authService.hasPrivilege('adminTypes', PrivilegeAccess.R);
  }

  protected canViewActivityLogs(): boolean {
    return this.authService.hasPrivilege('userLogs', PrivilegeAccess.R);
  }

  protected canViewSettings(): boolean {
    return this.authService.hasPrivilege('settings', PrivilegeAccess.R);
  }
}


