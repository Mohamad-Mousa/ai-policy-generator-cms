/** Subdomain object nested on domain list/detail API responses. */
export interface DomainNestedSubdomain {
  _id: string;
  title: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Domain {
  _id: string;
  title: string;
  description: string;
  /** Default assessment title when starting a new assessment for this domain. */
  predefinedAssessmentTitle?: string;
  icon?: string;
  subDomains?: DomainNestedSubdomain[];
  /** Mean of assessment scoreAvg (1–5) for this domain; omitted or null if none. */
  scoreAvg?: number | null;
  /** Mean of assessment scorePercentage for this domain; omitted or null if none. */
  scorePercentage?: number | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  __v?: number;
}

/** Use when displaying domain scores in the UI; missing or non-finite values show as 0. */
export function domainScoreOrZero(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export interface DomainPaginatedResponse {
  data: Domain[];
  totalCount: number;
  /** Aggregated across domains (when returned by the list API). */
  overallScoreAvg?: number | null;
  overallScorePercentage?: number | null;
}

export interface CreateDomainRequest {
  title: string;
  description: string;
  predefinedAssessmentTitle?: string;
  icon?: string;
  isActive?: boolean | string;
}

export interface UpdateDomainRequest {
  _id: string;
  title?: string;
  description?: string;
  predefinedAssessmentTitle?: string;
  icon?: string;
  isActive?: boolean | string;
}

