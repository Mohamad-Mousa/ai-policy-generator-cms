import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationToast } from './notification.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrls: ['./notification.scss'],
})
export class NotificationCenterComponent {
  readonly toasts = computed(() =>
    [...this.notifications.toasts()].sort((a, b) => a.createdAt - b.createdAt),
  );

  constructor(private readonly notifications: NotificationService) {}

  protected trackById = (_: number, toast: NotificationToast) => toast.id;

  protected dismiss(toast: NotificationToast) {
    if (toast.dismissible) {
      this.notifications.dismiss(toast.id);
    }
  }

  protected toneIcon(tone: NotificationToast['tone']) {
    switch (tone) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'priority_high';
      case 'danger':
        return 'error';
      default:
        return 'info';
    }
  }
}


