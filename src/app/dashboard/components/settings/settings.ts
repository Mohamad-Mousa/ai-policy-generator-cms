import { Component } from '@angular/core';
import { ButtonComponent } from '../../../shared/components/button/button';

@Component({
  selector: 'app-settings-section',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsComponent {
  protected readonly preferences = [
    { label: 'Security alerts', description: 'Escalate critical incidents to SOC.', enabled: true },
    { label: 'Weekly digest', description: 'Email summary every Monday at 9:00 AM.', enabled: false },
    { label: 'Auto-approve invitations', description: 'Fast-track trusted domains.', enabled: false },
  ];
}

