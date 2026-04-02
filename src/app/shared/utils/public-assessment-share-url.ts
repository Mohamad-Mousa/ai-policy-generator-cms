import { environment } from '../../../environments/environment';

/** Full URL respondents can use to complete a public assessment for the domain. */
export function publicAssessmentShareUrl(domainId: string): string {
  const base = environment.publicAssessmentShareBaseUrl.replace(/\/$/, '');
  return `${base}/${domainId}`;
}
