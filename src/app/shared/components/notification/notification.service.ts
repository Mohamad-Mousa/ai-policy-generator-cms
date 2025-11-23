import { Injectable, signal } from '@angular/core';

export type NotificationTone = 'success' | 'info' | 'warning' | 'danger';

export interface NotificationToast {
  id: number;
  title?: string;
  message: string;
  tone: NotificationTone;
  duration: number;
  dismissible: boolean;
  createdAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private counter = 0;
  private readonly defaultDuration = 4200;
  private readonly _toasts = signal<NotificationToast[]>([]);

  readonly toasts = this._toasts.asReadonly();

  show(options: {
    message: string;
    title?: string;
    tone?: NotificationTone;
    duration?: number;
    dismissible?: boolean;
  }) {
    const duration = options.duration ?? this.defaultDuration;
    const toast: NotificationToast = {
      id: ++this.counter,
      message: options.message,
      title: options.title,
      tone: options.tone ?? 'info',
      duration,
      dismissible: options.dismissible ?? true,
      createdAt: Date.now(),
    };

    this._toasts.update((current) => [...current, toast]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast.id), duration);
    }

    return toast.id;
  }

  success(message: string, title?: string, duration?: number) {
    return this.show({ message, title, tone: 'success', duration });
  }

  info(message: string, title?: string, duration?: number) {
    return this.show({ message, title, tone: 'info', duration });
  }

  warning(message: string, title?: string, duration?: number) {
    return this.show({ message, title, tone: 'warning', duration });
  }

  danger(message: string, title?: string, duration?: number) {
    return this.show({ message, title, tone: 'danger', duration });
  }

  dismiss(id: number) {
    this._toasts.update((current) => current.filter((toast) => toast.id !== id));
  }

  clearAll() {
    this._toasts.set([]);
  }
}


