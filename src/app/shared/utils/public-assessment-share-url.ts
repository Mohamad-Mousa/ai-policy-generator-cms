import { environment } from '../../../environments/environment';

/** Full URL respondents can use to complete a public assessment for the domain. */
export function publicAssessmentShareUrl(domainId: string): string {
  const base = environment.publicAssessmentShareBaseUrl.replace(/\/$/, '');
  return `${base}/${domainId}`;
}

/**
 * Public multi-domain flow: `/assessment/domains?domains=id1,id2`.
 * Origin is taken from `publicAssessmentShareBaseUrl` so dev/prod stay aligned.
 */
export function publicMultiAssessmentShareUrl(domainIds: string[]): string {
  const ids = [...new Set(domainIds.map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) {
    return '';
  }
  try {
    const raw = environment.publicAssessmentShareBaseUrl.trim();
    const parsed = new URL(
      /^https?:\/\//i.test(raw) ? raw : `https://${raw}`,
    );
    const params = new URLSearchParams({ domains: ids.join(',') });
    return `${parsed.origin}/assessment/domains?${params.toString()}`;
  } catch {
    return '';
  }
}
