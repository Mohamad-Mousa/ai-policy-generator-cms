import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type PillTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type PillSize = 'sm' | 'md';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pill.html',
  styleUrls: ['./pill.scss'],
})
export class StatusPillComponent {
  @Input({ required: true }) label!: string;
  @Input() tone: PillTone = 'neutral';
  @Input() size: PillSize = 'md';
  @Input() icon?: string;
  @Input() outline = false;

  protected get toneClass() {
    return `tone-${this.tone}`;
  }
}

