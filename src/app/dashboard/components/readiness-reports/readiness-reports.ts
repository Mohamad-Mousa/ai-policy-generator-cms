import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '@shared/components/button/button';

interface DomainScore {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'moderate' | 'needs-improvement';
  gaps: string[];
  recommendations: string[];
}

interface OverallReadiness {
  totalScore: number;
  maxScore: number;
  percentage: number;
  level: 'high' | 'medium' | 'low';
  lastUpdated: Date;
}

@Component({
  selector: 'app-readiness-reports',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './readiness-reports.html',
  styleUrl: './readiness-reports.scss',
})
export class ReadinessReportsComponent {
  protected overallReadiness: OverallReadiness = {
    totalScore: 0,
    maxScore: 100,
    percentage: 0,
    level: 'low',
    lastUpdated: new Date(),
  };

  protected domainScores: DomainScore[] = [
    {
      id: 'technological-infrastructure',
      name: 'Technological Infrastructure',
      score: 0,
      maxScore: 20,
      status: 'needs-improvement',
      gaps: ['No assessment completed yet'],
      recommendations: [
        'Complete the AI Readiness Assessment to generate recommendations',
      ],
    },
    {
      id: 'data-ecosystem',
      name: 'Data Ecosystem',
      score: 0,
      maxScore: 20,
      status: 'needs-improvement',
      gaps: ['No assessment completed yet'],
      recommendations: [
        'Complete the AI Readiness Assessment to generate recommendations',
      ],
    },
    {
      id: 'human-capital',
      name: 'Human Capital',
      score: 0,
      maxScore: 20,
      status: 'needs-improvement',
      gaps: ['No assessment completed yet'],
      recommendations: [
        'Complete the AI Readiness Assessment to generate recommendations',
      ],
    },
    {
      id: 'government-policy',
      name: 'Government Policy & Regulation',
      score: 0,
      maxScore: 20,
      status: 'needs-improvement',
      gaps: ['No assessment completed yet'],
      recommendations: [
        'Complete the AI Readiness Assessment to generate recommendations',
      ],
    },
    {
      id: 'ai-innovation',
      name: 'AI Innovation & Economic Drivers',
      score: 0,
      maxScore: 20,
      status: 'needs-improvement',
      gaps: ['No assessment completed yet'],
      recommendations: [
        'Complete the AI Readiness Assessment to generate recommendations',
      ],
    },
  ];

  protected selectedDomain: DomainScore | null = null;
  protected viewMode: 'overview' | 'detailed' = 'overview';

  protected getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      excellent: 'bg-success-subtle text-success-emphasis',
      good: 'bg-info-subtle text-info-emphasis',
      moderate: 'bg-warning-subtle text-warning-emphasis',
      'needs-improvement': 'bg-danger-subtle text-danger-emphasis',
    };
    return classes[status] || classes['needs-improvement'];
  }

  protected getLevelClass(level: string): string {
    const classes: Record<string, string> = {
      high: 'bg-success-subtle text-success-emphasis',
      medium: 'bg-warning-subtle text-warning-emphasis',
      low: 'bg-danger-subtle text-danger-emphasis',
    };
    return classes[level] || classes['low'];
  }

  protected selectDomain(domain: DomainScore) {
    this.selectedDomain = domain;
    this.viewMode = 'detailed';
  }

  protected backToOverview() {
    this.selectedDomain = null;
    this.viewMode = 'overview';
  }

  protected exportReport(format: 'pdf' | 'excel') {
    console.log(`Exporting report as ${format}`);
  }
}
