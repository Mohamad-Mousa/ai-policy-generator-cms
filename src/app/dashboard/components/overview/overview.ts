import { Component } from '@angular/core';
import { ButtonComponent } from '../../../shared/components/button/button';

interface StatCard {
  id: number;
  label: string;
  value: string;
  status: string;
  badgeClass: string;
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class OverviewComponent {
  protected readonly statCards: StatCard[] = [
    {
      id: 1,
      label: 'Active Admins',
      value: '128',
      status: 'Up 12% vs last week',
      badgeClass: 'bg-success-subtle text-success-emphasis',
    },
    {
      id: 2,
      label: 'Pending Invites',
      value: '36',
      status: 'Action required',
      badgeClass: 'bg-warning-subtle text-warning-emphasis',
    },
    {
      id: 3,
      label: 'Admin Types',
      value: '8',
      status: 'Aligned with policy',
      badgeClass: 'bg-primary-subtle text-primary-emphasis',
    },
    {
      id: 4,
      label: 'Security Alerts',
      value: '2',
      status: 'Review escalation queue',
      badgeClass: 'bg-danger-subtle text-danger-emphasis',
    },
  ];
}

