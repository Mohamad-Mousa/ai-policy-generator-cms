import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button';

interface Domain {
  id: string;
  name: string;
  description: string;
  icon: string;
  completed: boolean;
  progress: number;
}

@Component({
  selector: 'app-ai-readiness-assessment',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './ai-readiness-assessment.html',
  styleUrl: './ai-readiness-assessment.scss',
})
export class AIReadinessAssessmentComponent {
  protected readonly domains: Domain[] = [
    {
      id: 'technological-infrastructure',
      name: 'Technological Infrastructure',
      description: 'Assess IT infrastructure, cloud capabilities, and technical readiness',
      icon: 'cloud',
      completed: false,
      progress: 0,
    },
    {
      id: 'data-ecosystem',
      name: 'Data Ecosystem',
      description: 'Evaluate data quality, governance, and availability',
      icon: 'database',
      completed: false,
      progress: 0,
    },
    {
      id: 'human-capital',
      name: 'Human Capital',
      description: 'Review workforce skills, training, and AI expertise',
      icon: 'groups',
      completed: false,
      progress: 0,
    },
    {
      id: 'government-policy',
      name: 'Government Policy & Regulation',
      description: 'Analyze regulatory framework and policy alignment',
      icon: 'gavel',
      completed: false,
      progress: 0,
    },
    {
      id: 'ai-innovation',
      name: 'AI Innovation & Economic Drivers',
      description: 'Examine innovation ecosystem and economic factors',
      icon: 'trending_up',
      completed: false,
      progress: 0,
    },
  ];

  protected selectedDomain: Domain | null = null;
  protected isQuestionnaireOpen = false;

  constructor(private router: Router) {}

  protected selectDomain(domain: Domain) {
    this.selectedDomain = domain;
    this.isQuestionnaireOpen = true;
  }

  protected closeQuestionnaire() {
    this.isQuestionnaireOpen = false;
    this.selectedDomain = null;
  }

  protected startNewAssessment() {
    // Navigate to assessment creation page
    this.router.navigate(['/dashboard/assessment']);
  }
}

