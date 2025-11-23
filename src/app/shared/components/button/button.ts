import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { LoaderComponent } from '../loader/loader';
import { AuthService } from '@shared/services';
import { PrivilegeAccess } from '@shared/enums';

type ButtonVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'outline'
  | 'ghost'
  | 'text'
  | 'primary-gradient'
  | 'danger-gradient';
type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class ButtonComponent {
  private authService = inject(AuthService);

  @Input() label = 'Action';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() disabled = false;
  @Input() icon?: string;
  @Input() loading = false;
  @Input() functionKey?: string; // Function key for privilege checking
  @Input() privilegeAccess?: PrivilegeAccess; // Required privilege access level
  @Output() clicked = new EventEmitter<MouseEvent>();

  protected get hostClasses(): string[] {
    const classes: string[] = [];
    
    // For gradient variants, use custom classes instead of Bootstrap classes
    if (this.variant === 'text') {
      classes.push('btn-text');
    } else if (this.variant === 'primary-gradient') {
      classes.push('btn-primary');
    } else if (this.variant === 'danger-gradient') {
      classes.push('btn-danger');
    } else {
      // Use Bootstrap classes for other variants
      classes.push('btn', `btn-${this.variantMap[this.variant] ?? 'primary'}`);
    }
    
    // Add size class only for Bootstrap variants
    if (this.variant !== 'text' && this.variant !== 'primary-gradient' && this.variant !== 'danger-gradient') {
      const sizeClass = this.sizeClassMap[this.size];
      if (sizeClass) {
        classes.push(sizeClass);
      }
    }
    
    return classes.filter(Boolean);
  }

  private readonly variantMap: Record<ButtonVariant, string> = {
    primary: 'primary',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    outline: 'outline-secondary',
    ghost: 'link',
    'text': 'text',
    'primary-gradient': 'primary',
    'danger-gradient': 'danger',
  };

  private readonly sizeClassMap: Record<ButtonSize, string> = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  protected get isDisabled(): boolean {
    // Check manual disabled state
    if (this.disabled) {
      return true;
    }
    // Check privilege if functionKey and privilegeAccess are provided
    if (this.functionKey && this.privilegeAccess) {
      return !this.authService.hasPrivilege(
        this.functionKey,
        this.privilegeAccess
      );
    }
    return false;
  }

  protected onClick(event: MouseEvent): void {
    if (this.isDisabled || this.loading) {
      event.preventDefault();
      return;
    }
    this.clicked.emit(event);
  }
}
