import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  forwardRef,
  OnInit,
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-input.html',
  styleUrl: './form-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormInputComponent),
      multi: true,
    },
  ],
})
export class FormInputComponent implements ControlValueAccessor, OnInit {
  @Input() label = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' = 'text';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() readonly = false;
  @Input() autocomplete?: string;
  @Input() min?: number;
  @Input() max?: number;
  @Input() step?: number;
  @Input() maxlength?: number;
  @Input() minlength?: number;
  @Input() rows?: number; // For textarea
  @Input() options: SelectOption[] = []; // For select
  @Input() errorMessage?: string; // Custom error message
  @Input() showError = true; // Whether to show error messages
  @Input() control?: AbstractControl | null; // Allow passing control directly

  value: any = '';
  private _touched = false;
  private _invalid = false;
  onChange = (value: any) => {};
  onTouched = () => {};

  constructor() {}

  ngOnInit(): void {
    // Subscribe to control status changes if control is provided
    if (this.control && this.control instanceof FormControl) {
      this.control.statusChanges.subscribe(() => {
        if (this.control instanceof FormControl) {
          this._invalid = this.control.invalid;
          this._touched = this.control.touched || this.control.dirty;
        }
      });
      this._invalid = this.control.invalid;
      this._touched = this.control.touched || this.control.dirty;
    }
  }

  writeValue(value: any): void {
    if (this.type === 'number') {
      this.value = value ?? null;
    } else if (this.type === 'select') {
      this.value = value ?? '';
    } else {
      this.value = value ?? '';
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    let value: any = target.value;
    
    // Convert to number if type is number
    if (this.type === 'number' && value !== '') {
      value = Number(value);
    }
    
    // Handle empty select values
    if (this.type === 'select' && value === '') {
      value = null;
    }
    
    this.value = value;
    this.onChange(value);
  }

  onBlur(): void {
    this._touched = true;
    this.onTouched();
  }

  get hasError(): boolean {
    if (!this.showError || !this.control || !(this.control instanceof FormControl)) {
      return false;
    }
    return this.control.invalid && (this.control.dirty || this.control.touched || this._touched);
  }

  get errorText(): string {
    if (!this.hasError || !this.control || !(this.control instanceof FormControl)) {
      return '';
    }

    if (this.errorMessage) {
      return this.errorMessage;
    }

    const errors = this.control.errors;
    if (!errors) {
      return '';
    }

    if (errors['required']) {
      return `${this.label || 'This field'} is required.`;
    }
    if (errors['email']) {
      return 'Please enter a valid email address.';
    }
    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      return `${this.label || 'This field'} must be at least ${requiredLength} characters.`;
    }
    if (errors['maxlength']) {
      const requiredLength = errors['maxlength'].requiredLength;
      return `${this.label || 'This field'} must not exceed ${requiredLength} characters.`;
    }
    if (errors['min']) {
      const min = errors['min'].min;
      return `${this.label || 'This field'} must be at least ${min}.`;
    }
    if (errors['max']) {
      const max = errors['max'].max;
      return `${this.label || 'This field'} must not exceed ${max}.`;
    }
    if (errors['pattern']) {
      return 'Please enter a valid value.';
    }

    return 'Invalid value.';
  }
}

