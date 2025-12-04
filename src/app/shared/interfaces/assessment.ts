import { Domain } from './domain';

export interface AssessmentQuestion {
  /**
   * Question text stored directly on the assessment
   */
  question: string;
  /**
   * Reference to the original question document (ObjectId as string)
   */
  questionRef: string;
  /**
   * Answer value - type depends on how the question was answered
   */
  answer?: string | string[] | number;
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
    questionRef: string;
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
    questionRef: string;
    answer?: string | string[] | number;
  }>;
  status?: string;
  isActive?: boolean | string;
}

