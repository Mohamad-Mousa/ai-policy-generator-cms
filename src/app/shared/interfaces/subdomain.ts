/** Populated domain on list/detail responses (API may return this instead of a raw id). */
export interface SubdomainDomainRef {
  _id: string;
  title: string;
  icon?: string;
  isActive?: boolean;
}

export interface Subdomain {
  _id: string;
  title: string;
  domain: string | SubdomainDomainRef;
  isActive: boolean;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

/** Domain id whether API returned a string or populated object. */
export function subdomainDomainId(
  domain: Subdomain['domain']
): string {
  return typeof domain === 'string' ? domain : domain._id;
}

/** Display title when domain may be populated or only an id. */
export function subdomainDomainTitle(
  domain: Subdomain['domain'],
  titleById?: Map<string, string>
): string {
  if (typeof domain === 'object' && domain !== null) {
    return (
      domain.title || titleById?.get(domain._id) || domain._id
    );
  }
  return titleById?.get(domain) ?? domain;
}

export interface SubdomainPaginatedResponse {
  data: Subdomain[];
  totalCount: number;
}

export interface CreateSubdomainRequest {
  title: string;
  domain: string;
  isActive?: boolean;
}

export interface UpdateSubdomainRequest {
  _id: string;
  title?: string;
  domain?: string;
  isActive?: boolean;
}
