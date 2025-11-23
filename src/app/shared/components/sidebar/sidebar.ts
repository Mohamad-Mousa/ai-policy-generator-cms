import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusPillComponent, PillTone } from '../pill/pill';
import { environment } from '../../../../environments/environment';

export interface SidebarField {
  label: string;
  key: string;
  type?: 'text' | 'badge' | 'image' | 'date' | 'icon';
  badgeClassKey?: string;
  format?: (value: any) => string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, StatusPillComponent],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent {
  @Input() open = false;
  @Input() title = 'Record Details';
  @Input() width = '480px';
  @Input() disableClose = false;
  @Input() fields: SidebarField[] = [];
  @Input() data: Record<string, unknown> = {};

  @Output() closed = new EventEmitter<'backdrop' | 'escape' | 'close-button'>();

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open && !this.disableClose) {
      this.handleClose('escape');
    }
  }

  handleClose(reason: 'backdrop' | 'escape' | 'close-button') {
    if (this.disableClose) {
      return;
    }
    this.closed.emit(reason);
  }

  protected getFieldValue(field: SidebarField): any {
    return this.data[field.key];
  }

  protected getFieldLabel(field: SidebarField): string {
    const value = this.getFieldValue(field);
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (field.format) {
      return field.format(value);
    }
    return String(value);
  }

  protected badgeClassFor(field: SidebarField): PillTone {
    if (field.badgeClassKey) {
      const value = this.data[field.badgeClassKey];
      if (typeof value === 'string') {
        return this.mapTone(value);
      }
    }
    return 'neutral';
  }

  private mapTone(value: string): PillTone {
    const normalized = value.toLowerCase();
    if (normalized.includes('active') || normalized.includes('success')) {
      return 'success';
    }
    if (normalized.includes('pending') || normalized.includes('warning')) {
      return 'warning';
    }
    if (normalized.includes('error') || normalized.includes('danger')) {
      return 'danger';
    }
    if (normalized.includes('info')) {
      return 'info';
    }
    return 'neutral';
  }

  protected formatDate(value: any): string {
    if (!value) return '—';
    try {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(value);
    }
  }

  protected getImageUrl(field: SidebarField): string | undefined {
    const value = this.getFieldValue(field);
    if (!value || typeof value !== 'string') {
      return undefined;
    }
    
    // If the value already starts with http:// or https://, return as is
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    
    // Otherwise, prepend environment.IMG_URL
    return environment.IMG_URL + value;
  }
}

