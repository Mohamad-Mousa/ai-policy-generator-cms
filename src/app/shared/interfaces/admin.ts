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
  type: 'text' | 'radio' | 'checkbox' | 'number';
  domain: {
    _id: string;
    title: string;
  };
  answers?: string[];
  min?: number;
  max?: number;
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
  type: 'text' | 'radio' | 'checkbox' | 'number';
  domain: string;
  answers?: string[];
  min?: number;
  max?: number;
  isActive?: boolean | string;
}

export interface UpdateQuestionRequest {
  _id: string;
  question?: string;
  type?: 'text' | 'radio' | 'checkbox' | 'number';
  domain?: string;
  answers?: string[];
  min?: number;
  max?: number;
  isActive?: boolean | string;
}

export interface AssessmentQuestion {
  _id: string; // Assessment question ID
  question: {
    _id: string;
    question: string; // Question text
    domain: string;
    type: 'text' | 'radio' | 'checkbox' | 'number';
    isActive: boolean;
    answers?: string[]; // For radio/checkbox types
    min?: number; // For number type
    max?: number; // For number type
  };
  answer?: string | string[] | number; // Answer value - type depends on question type
}

export interface Assessment {
  _id: string;
  title: string;
  description: string;
  fullName: string;
  domain: {
    _id: string;
    title: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
    subDomains?: any[];
  };
  questions: AssessmentQuestion[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  __v?: number;
  status?: string;
}

export interface AssessmentPaginatedResponse {
  data: Assessment[];
  totalCount: number;
}

export interface CreateAssessmentRequest {
  domain?: string;
  title: string;
  description?: string;
  fullName?: string;
  questions?: Array<{
    question: string;
    answer?: string | string[] | number;
  }>;
  status?: string;
  isActive?: boolean | string;
}

export interface UpdateAssessmentRequest {
  _id: string;
  domain?: string;
  title?: string;
  description?: string;
  fullName?: string;
  questions?: Array<{
    question: string;
    answer?: string | string[] | number;
  }>;
  status?: string;
  isActive?: boolean | string;
}