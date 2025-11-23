import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type LoaderVariant = 'inline' | 'overlay';
type LoaderSize = 'sm' | 'md' | 'lg';
type LoaderContext = 'default' | 'button';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.html',
  styleUrls: ['./loader.scss'],
})
export class LoaderComponent {
  @Input() size: LoaderSize = 'md';
  @Input() variant: LoaderVariant = 'inline';
  @Input() label?: string;
  @Input() fullscreen = false;
  @Input() context: LoaderContext = 'default';

  protected get hostClasses(): string[] {
    const classes = ['loader-host', `size-${this.size}`, `context-${this.context}`];
    if (this.variant === 'overlay') {
      classes.push('loader-overlay');
      if (this.fullscreen) {
        classes.push('loader-fullscreen');
      }
    } else {
      classes.push('loader-inline');
    }
    return classes;
  }
}


