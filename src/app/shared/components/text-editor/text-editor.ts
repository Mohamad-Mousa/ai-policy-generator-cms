import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
  forwardRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

@Component({
  selector: 'app-text-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-editor.html',
  styleUrl: './text-editor.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextEditorComponent),
      multi: true,
    },
  ],
})
export class TextEditorComponent implements ControlValueAccessor, AfterViewInit {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() hint = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() minHeight = 280;
  @Input() control?: AbstractControl | null;

  @ViewChild('editor', { static: true })
  private editorElement!: ElementRef<HTMLDivElement>;

  protected isFocused = false;
  protected value = '';

  private viewInitialized = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.applyValueToHost();
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
    if (this.viewInitialized) {
      this.applyValueToHost();
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected onEditorInput(): void {
    this.syncValueFromHost();
  }

  protected onEditorFocus(): void {
    this.isFocused = true;
  }

  protected onEditorBlur(): void {
    this.isFocused = false;
    this.syncValueFromHost();
    this.onTouched();
    this.control?.markAsTouched();
  }

  protected exec(command: string, value?: string): void {
    if (this.disabled || this.readonly) {
      return;
    }

    document.execCommand(command, false, value);
    this.syncValueFromHost();
  }

  protected createLink(): void {
    if (this.disabled || this.readonly) {
      return;
    }

    const url = prompt('Enter URL');
    if (url) {
      document.execCommand('createLink', false, url);
    }
    this.syncValueFromHost();
  }

  protected removeFormatting(): void {
    if (this.disabled || this.readonly) {
      return;
    }
    document.execCommand('removeFormat');
    document.execCommand('unlink');
    this.syncValueFromHost();
  }

  protected clearAll(): void {
    if (this.disabled || this.readonly) {
      return;
    }
    this.editorElement.nativeElement.innerHTML = '';
    this.syncValueFromHost();
  }

  protected get hasError(): boolean {
    if (!this.control) {
      return false;
    }
    return this.control.invalid && (this.control.dirty || this.control.touched);
  }

  protected get errorText(): string {
    if (!this.hasError || !this.control) {
      return '';
    }

    const errors = this.control.errors;
    if (!errors) {
      return '';
    }

    if (errors['required']) {
      return `${this.label || 'This field'} is required.`;
    }
    if (errors['minlength']) {
      return `${this.label || 'This field'} must be at least ${
        errors['minlength'].requiredLength
      } characters.`;
    }

    return 'Invalid value.';
  }

  private syncValueFromHost(): void {
    const html = this.editorElement.nativeElement.innerHTML;
    this.value = html;
    this.onChange(html);
  }

  private applyValueToHost(): void {
    this.editorElement.nativeElement.innerHTML = this.value || '';
  }
}

