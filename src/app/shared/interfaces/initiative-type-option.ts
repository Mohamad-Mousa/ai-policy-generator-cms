export interface InitiativeTypeOption {
  _id: string;
  value: number;
  label: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InitiativeTypeOptionListResponse {
  data: InitiativeTypeOption[];
  totalCount: number;
}
