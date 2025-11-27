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

export interface Question {
  _id: string;
  question: string;
  domain: {
    _id: string;
    title: string;
  };
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  __v?: number;
}

export interface QuestionPaginatedResponse {
  data: Question[];
  totalCount: number;
}

export interface CreateQuestionRequest {
  question: string;
  domain: string;
  isActive?: boolean | string;
}

export interface UpdateQuestionRequest {
  _id: string;
  question?: string;
  domain?: string;
  isActive?: boolean | string;
}