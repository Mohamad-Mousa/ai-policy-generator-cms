export interface AiTag {
  _id: string;
  value: number;
  label: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiTagListResponse {
  data: AiTag[];
  totalCount: number;
}
