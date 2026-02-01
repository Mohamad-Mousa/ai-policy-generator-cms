export interface Country {
  _id: string;
  value: number;
  label: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CountryListResponse {
  data: Country[];
  totalCount: number;
}
