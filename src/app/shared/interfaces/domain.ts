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
  icon?: string;
  subDomains?: DomainNestedSubdomain[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  __v?: number;
}

export interface DomainPaginatedResponse {
  data: Domain[];
  totalCount: number;
}

export interface CreateDomainRequest {
  title: string;
  description: string;
  icon?: string;
  isActive?: boolean | string;
  subDomains?: string[];
}

export interface UpdateDomainRequest {
  _id: string;
  title?: string;
  description?: string;
  icon?: string;
  isActive?: boolean | string;
  subDomains?: string[];
}

