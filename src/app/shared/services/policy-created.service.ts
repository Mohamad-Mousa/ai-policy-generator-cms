import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type PolicyCreatedTab = 'library' | 'initiativeLibrary';

export interface CreatedPolicyPayload {
  policyId: string;
  tab: PolicyCreatedTab;
}

@Injectable({ providedIn: 'root' })
export class PolicyCreatedService {
  /** Emits when a policy is created; library subscribes and calls findOne(policyId). */
  private readonly createdPolicy$ = new BehaviorSubject<CreatedPolicyPayload | null>(null);

  setCreatedPolicy(policyId: string, tab: PolicyCreatedTab): void {
    this.createdPolicy$.next({ policyId, tab });
  }

  getCreatedPolicy$() {
    return this.createdPolicy$.asObservable();
  }

  /** Call after loading/showing the policy so it is not shown again. */
  clearCreatedPolicy(): void {
    this.createdPolicy$.next(null);
  }
}
