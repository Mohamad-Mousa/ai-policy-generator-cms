import { Domain } from './domain';

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

