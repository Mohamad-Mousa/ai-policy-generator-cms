import type { SubdomainDomainRef } from './subdomain';

/** Populated subdomain on question list/detail (ref: Subdomain). */
export interface QuestionSubdomainRef {
  _id: string;
  title: string;
  domain?: string | SubdomainDomainRef;
}

/** Radio options from API: unique integer score 1–5 per option. */
export interface QuestionRadioAnswer {
  text: string;
  score: number;
}

/** Checkbox options from API: `{ text }` (strings also accepted on write). */
export interface QuestionCheckboxAnswer {
  text: string;
}

export type QuestionAnswerItem =
  | string
  | QuestionRadioAnswer
  | QuestionCheckboxAnswer;

export interface Question {
  _id: string;
  question: string;
  type: 'text' | 'radio' | 'checkbox' | 'number';
  subdomain: string | QuestionSubdomainRef;
  answers?: QuestionAnswerItem[];
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
  subdomain: string;
  /** Radio: `{ text, score }[]` (scores 1–5). Checkbox: strings or `{ text }[]`. */
  answers?: string[] | QuestionRadioAnswer[] | QuestionCheckboxAnswer[];
  min?: number;
  max?: number;
  isActive?: boolean | string;
}

export interface UpdateQuestionRequest {
  _id: string;
  question?: string;
  type?: 'text' | 'radio' | 'checkbox' | 'number';
  subdomain?: string;
  answers?: string[] | QuestionRadioAnswer[] | QuestionCheckboxAnswer[];
  min?: number;
  max?: number;
  isActive?: boolean | string;
}

export function questionSubdomainId(
  subdomain: Question['subdomain']
): string {
  return typeof subdomain === 'string' ? subdomain : subdomain._id;
}

export function questionSubdomainLabel(
  subdomain: Question['subdomain']
): string {
  if (typeof subdomain === 'object' && subdomain !== null) {
    const subTitle = subdomain.title || subdomain._id;
    const dom = subdomain.domain;
    if (typeof dom === 'object' && dom !== null && 'title' in dom && dom.title) {
      return `${dom.title} › ${subTitle}`;
    }
    return subTitle;
  }
  return subdomain;
}

/** Option labels for UIs that expect `string[]` (e.g. assessment radio/checkbox lists). */
export function questionAnswerOptionLabels(
  answers: Question['answers'] | undefined,
): string[] | undefined {
  if (!answers?.length) return undefined;
  return answers.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object' && 'text' in item) return item.text;
    return String(item);
  });
}

/** Table/sidebar: radio shows `text (score)`; checkbox shows comma-separated labels. */
export function formatQuestionAnswersSummary(question: Question): string {
  const items = question.answers;
  if (!items?.length) return '—';
  if (question.type === 'radio') {
    return items
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) {
          const t = item.text;
          const s =
            'score' in item && item.score != null ? ` (${item.score})` : '';
          return `${t}${s}`;
        }
        return String(item);
      })
      .join(', ');
  }
  if (question.type === 'checkbox') {
    return items
      .map((item) =>
        typeof item === 'string' ? item : (item as QuestionCheckboxAnswer).text,
      )
      .join(', ');
  }
  return '—';
}
