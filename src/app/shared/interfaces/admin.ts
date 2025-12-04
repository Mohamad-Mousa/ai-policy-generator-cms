import { AdminType } from './admin-type';

export interface Admin {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  type: AdminType;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  image?: string;
  [key: string]: any;
}

export interface AdminPaginatedResponse {
  data: Admin[];
  totalCount: number;
}
