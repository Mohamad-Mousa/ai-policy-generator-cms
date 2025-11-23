import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button';
import { PrivilegeAccess } from '@shared/enums';

export interface DialogButton {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  functionKey?: string;
  privilegeAccess?: PrivilegeAccess;
  action: () => void;
}

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './dialog.html',
  styleUrls: ['./dialog.scss'],
})
export class DialogComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() description = '';
  @Input() width = '520px';
  @Input() disableClose = false;
  @Input() buttons: DialogButton[] = [];

  @Output() closed = new EventEmitter<'backdrop' | 'escape' | 'close-button'>();

  protected get isAnyButtonLoading(): boolean {
    return this.buttons?.some((button) => button.loading) ?? false;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open && !this.disableClose && !this.isAnyButtonLoading) {
      this.handleClose('escape');
    }
  }

  handleClose(reason: 'backdrop' | 'escape' | 'close-button') {
    if (this.disableClose || this.isAnyButtonLoading) {
      return;
    }
    this.closed.emit(reason);
  }
}
