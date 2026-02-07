import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
import { loginGuard } from './shared/guards/login.guard';
import { privilegeGuard } from './shared/guards/privilege.guard';
import { PrivilegeAccess } from './shared/enums';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    canActivate: [loginGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import(
            './dashboard/components/dashboard-redirect/dashboard-redirect'
          ).then((m) => m.DashboardRedirectComponent),
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./dashboard/components/admin-cms/admin-cms').then(
            (m) => m.AdminCmsComponent
          ),
        canActivate: [privilegeGuard('admins', PrivilegeAccess.R)],
      },
      {
        path: 'admins',
        loadComponent: () =>
          import('./dashboard/components/admins/admins').then(
            (m) => m.AdminsComponent
          ),
        canActivate: [privilegeGuard('admins', PrivilegeAccess.R)],
      },
      {
        path: 'admin-types',
        loadComponent: () =>
          import('./dashboard/components/admin-types/admin-types').then(
            (m) => m.AdminTypesComponent
          ),
        canActivate: [privilegeGuard('adminTypes', PrivilegeAccess.R)],
      },
      {
        path: 'domains',
        loadComponent: () =>
          import('./dashboard/components/domains-cms/domains-cms').then(
            (m) => m.DomainsCmsComponent
          ),
        canActivate: [privilegeGuard('domains', PrivilegeAccess.R)],
      },
      {
        path: 'questions',
        loadComponent: () =>
          import('./dashboard/components/questions/questions').then(
            (m) => m.QuestionsComponent
          ),
        canActivate: [privilegeGuard('questions', PrivilegeAccess.R)],
      },
      {
        path: 'activity-logs',
        loadComponent: () =>
          import('./dashboard/components/activity-logs/activity-logs').then(
            (m) => m.ActivityLogsComponent
          ),
        canActivate: [privilegeGuard('userLogs', PrivilegeAccess.R)],
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./dashboard/components/settings/settings').then(
            (m) => m.SettingsComponent
          ),
        canActivate: [privilegeGuard('settings', PrivilegeAccess.R)],
      },
      {
        path: 'ai-readiness-assessment',
        loadComponent: () =>
          import('./dashboard/components/ai-readiness-assessment/ai-readiness-assessment').then(
            (m) => m.AIReadinessAssessmentComponent
          ),
      },
      {
        path: 'assessment',
        loadComponent: () =>
          import('./dashboard/components/assessment/assessment').then(
            (m) => m.AssessmentComponent
          ),
      },
      {
        path: 'readiness-reports',
        loadComponent: () =>
          import('./dashboard/components/readiness-reports/readiness-reports').then(
            (m) => m.ReadinessReportsComponent
          ),
      },
      {
        path: 'policy-generator',
        loadComponent: () =>
          import('./dashboard/components/policy-cms/policy-cms').then(
            (m) => m.PolicyCmsComponent
          ),
        canActivate: [privilegeGuard('policies', PrivilegeAccess.R)],
      },
      {
        path: 'policy-library',
        loadComponent: () =>
          import('./dashboard/components/policy-cms/policy-cms').then(
            (m) => m.PolicyCmsComponent
          ),
        canActivate: [privilegeGuard('policies', PrivilegeAccess.R)],
      },
      {
        path: 'initiative-library',
        loadComponent: () =>
          import('./dashboard/components/policy-cms/policy-cms').then(
            (m) => m.PolicyCmsComponent
          ),
        canActivate: [privilegeGuard('policies', PrivilegeAccess.R)],
      },
      {
        path: 'initiative/:id',
        loadComponent: () =>
          import('./dashboard/components/initiative-detail/initiative-detail').then(
            (m) => m.InitiativeDetailComponent
          ),
        canActivate: [privilegeGuard('policies', PrivilegeAccess.R)],
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./dashboard/components/profile/profile').then(
            (m) => m.ProfileComponent
          ),
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
];
