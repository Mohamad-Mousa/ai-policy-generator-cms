import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@shared/services';
import { PrivilegeAccess } from '@shared/enums';
import { DomainsComponent } from '../domains/domains';
import { QuestionsComponent } from '../questions/questions';

@Component({
  selector: 'app-domains-cms',
  standalone: true,
  imports: [CommonModule, DomainsComponent, QuestionsComponent],
  templateUrl: './domains-cms.html',
  styleUrl: './domains-cms.scss',
})
export class DomainsCmsComponent implements OnInit {
  protected activeTab: 'domains' | 'questions' = 'domains';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    if (this.canViewDomains()) {
      this.activeTab = 'domains';
    } else if (this.canViewQuestions()) {
      this.activeTab = 'questions';
    }
  }

  protected setActiveTab(tab: 'domains' | 'questions'): void {
    this.activeTab = tab;
  }

  protected canViewDomains(): boolean {
    return this.authService.hasPrivilege('domains', PrivilegeAccess.R);
  }

  protected canViewQuestions(): boolean {
    return this.authService.hasPrivilege('questions', PrivilegeAccess.R);
  }
}


