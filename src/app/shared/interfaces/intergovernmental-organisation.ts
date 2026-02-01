export interface IntergovernmentalOrganisation {
  _id: string;
  value: number;
  label: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IntergovernmentalOrganisationListResponse {
  data: IntergovernmentalOrganisation[];
  totalCount: number;
}
