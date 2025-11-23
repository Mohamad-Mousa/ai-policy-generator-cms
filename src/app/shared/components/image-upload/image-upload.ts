import {
  CommonModule,
} from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';

type ImageShape = 'square' | 'round';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.html',
  styleUrls: ['./image-upload.scss'],
})
export class ImageUploadComponent {
  @Input() label = 'Upload image';
  @Input() hint = 'PNG or JPG up to 5MB';
  @Input() accept = 'image/*';
  @Input() maxSizeMb = 5;
  @Input() value?: string;
  @Input() disabled = false;
  @Input() shape: ImageShape = 'square';
  @Input() showRemove = true;

  @Output() valueChange = new EventEmitter<string | undefined>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() error = new EventEmitter<string>();

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  protected isDragging = false;
  protected errorMessage?: string;
  protected loading = false;

  protected onDragOver(event: DragEvent) {
    if (this.disabled) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  protected onDragLeave(event: DragEvent) {
    if (this.disabled) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  protected onDrop(event: DragEvent) {
    if (this.disabled) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  protected onFileChange(event: Event) {
    if (this.disabled) {
      return;
    }
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  protected triggerFileDialog() {
    if (this.disabled) {
      return;
    }
    this.fileInput?.nativeElement.click();
  }

  protected removeImage() {
    if (!this.showRemove || this.disabled) {
      return;
    }
    this.value = undefined;
    this.errorMessage = undefined;
    const input = this.fileInput?.nativeElement;
    if (input) {
      input.value = '';
    }
    this.valueChange.emit(undefined);
  }

  private processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this.setError('Unsupported file type.');
      return;
    }

    const maxBytes = this.maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      this.setError(`File exceeds ${this.maxSizeMb}MB limit.`);
      return;
    }

    this.errorMessage = undefined;
    this.loading = true;

    const reader = new FileReader();
    reader.onload = () => {
      this.loading = false;
      this.value = reader.result as string;
      this.valueChange.emit(this.value);
      this.fileSelected.emit(file);
    };
    reader.onerror = () => {
      this.loading = false;
      this.setError('Failed to read the image. Please try again.');
    };

    reader.readAsDataURL(file);
  }

  private setError(message: string) {
    this.errorMessage = message;
    this.error.emit(message);
    this.value = undefined;
    this.valueChange.emit(undefined);
    this.loading = false;
  }
}


