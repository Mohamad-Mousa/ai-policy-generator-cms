export interface Domain {
  _id: string;
  title: string;
  description: string;
  icon?: string;
  subDomains?: string[];
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

