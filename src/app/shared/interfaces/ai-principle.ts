export interface AiPrinciple {
  _id: string;
  value: number;
  label: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiPrincipleListResponse {
  data: AiPrinciple[];
  totalCount: number;
}
