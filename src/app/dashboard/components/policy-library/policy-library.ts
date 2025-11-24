import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/components/button/button';

interface Policy {
  id: string;
  title: string;
  sector: string;
  organizationSize: string;
  createdAt: Date;
  lastModified: Date;
  status: 'draft' | 'review' | 'approved' | 'archived';
  version: number;
}

@Component({
  selector: 'app-policy-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonComponent],
  templateUrl: './policy-library.html',
  styleUrl: './policy-library.scss',
})
export class PolicyLibraryComponent {
  protected policies: Policy[] = [
    {
      id: '1',
      title: 'AI Governance Policy - Healthcare Sector',
      sector: 'Healthcare',
      organizationSize: 'Large',
      createdAt: new Date('2024-01-15'),
      lastModified: new Date('2024-01-20'),
      status: 'approved',
      version: 2,
    },
    {
      id: '2',
      title: 'AI Ethics Framework - Government',
      sector: 'Government',
      organizationSize: 'Enterprise',
      createdAt: new Date('2024-02-01'),
      lastModified: new Date('2024-02-05'),
      status: 'review',
      version: 1,
    },
  ];

  protected selectedPolicy: Policy | null = null;
  protected viewMode: 'list' | 'detail' = 'list';
  protected searchTerm = '';
  protected filterStatus: string = 'all';
  protected filterSector: string = 'all';

  protected readonly statusOptions = [
    'all',
    'draft',
    'review',
    'approved',
    'archived',
  ];
  protected readonly sectorOptions = [
    'all',
    'Government',
    'Healthcare',
    'Finance',
    'Education',
    'Technology',
    'Manufacturing',
  ];

  protected get filteredPolicies(): Policy[] {
    return this.policies.filter((policy) => {
      const matchesSearch =
        !this.searchTerm ||
        policy.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        policy.sector.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        this.filterStatus === 'all' || policy.status === this.filterStatus;
      const matchesSector =
        this.filterSector === 'all' || policy.sector === this.filterSector;

      return matchesSearch && matchesStatus && matchesSector;
    });
  }

  protected getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      draft: 'bg-secondary-subtle text-secondary-emphasis',
      review: 'bg-warning-subtle text-warning-emphasis',
      approved: 'bg-success-subtle text-success-emphasis',
      archived: 'bg-dark-subtle text-dark-emphasis',
    };
    return classes[status] || classes['draft'];
  }

  protected selectPolicy(policy: Policy) {
    this.selectedPolicy = policy;
    this.viewMode = 'detail';
  }

  protected backToList() {
    this.selectedPolicy = null;
    this.viewMode = 'list';
  }

  protected editPolicy(policy: Policy) {
    console.log('Editing policy:', policy.id);
  }

  protected deletePolicy(policy: Policy) {
    if (confirm(`Are you sure you want to delete "${policy.title}"?`)) {
      this.policies = this.policies.filter((p) => p.id !== policy.id);
    }
  }

  protected exportPolicy(policy: Policy, format: 'pdf' | 'docx') {
    console.log(`Exporting policy ${policy.id} as ${format}`);
  }

  protected viewVersionHistory(policy: Policy) {
    console.log('Viewing version history for:', policy.id);
  }
}
