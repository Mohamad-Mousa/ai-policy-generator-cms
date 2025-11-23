export interface Function {
  _id: string;
  name: string;
  key: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface Privilege {
  _id: string;
  function: Function;
  adminType: string;
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

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

export interface PrivilegePermission {
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
}

export interface CreateAdminTypeRequest {
  name: string;
  privileges: Record<string, PrivilegePermission>;
}

export interface UpdateAdminTypeRequest {
  _id: string;
  name: string;
  privileges: Record<string, PrivilegePermission>;
}

export interface AdminTypePaginatedResponse {
  data: AdminType[];
  totalCount: number;
}

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

export interface User {
  id?: string | number;
  email?: string;
  name?: string;
  [key: string]: any;
}

export interface UserAuthenticated {
  admin: Admin;
  accessToken: string;
  refreshToken: string;
  privileges: Privilege[];
}
