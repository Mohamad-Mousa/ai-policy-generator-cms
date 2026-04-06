/** Shape needed to compute answered state (matches public assessment question items). */
export interface PublicQuestionProgressShape {
  type: 'text' | 'radio' | 'checkbox' | 'number';
  answer?: string | string[] | number;
}

export function isPublicQuestionAnswered(q: PublicQuestionProgressShape): boolean {
  if (q.type === 'checkbox') {
    return Array.isArray(q.answer) && q.answer.length > 0;
  }
  if (q.type === 'number') {
    return (
      q.answer !== undefined &&
      q.answer !== null &&
      !(typeof q.answer === 'number' && Number.isNaN(q.answer))
    );
  }
  const s = q.answer != null ? String(q.answer).trim() : '';
  return s.length > 0;
}

export function publicQuestionsAnsweredCount(
  questions: PublicQuestionProgressShape[],
): number {
  return questions.filter(isPublicQuestionAnswered).length;
}

/** 0–100; 0 if there are no questions. */
export function publicQuestionsProgressPercent(
  questions: PublicQuestionProgressShape[],
): number {
  const n = questions.length;
  if (n === 0) {
    return 0;
  }
  return Math.round((publicQuestionsAnsweredCount(questions) / n) * 100);
}
