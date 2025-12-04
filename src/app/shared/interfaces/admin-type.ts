import { Privilege, PrivilegePermission } from './privilege';

export interface AdminType {
  _id: string;
  name: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  privileges?: Privilege[];
}

export interface CreateAdminTypeRequest {
  name: string;
  privileges: Record<string, PrivilegePermission>;
  isActive?: boolean | string;
}

export interface UpdateAdminTypeRequest {
  _id: string;
  name: string;
  privileges: Record<string, PrivilegePermission>;
  isActive?: boolean | string;
}

export interface AdminTypePaginatedResponse {
  data: AdminType[];
  totalCount: number;
}

