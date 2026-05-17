import { jsPDF } from 'jspdf';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { Policy, PolicyAnalysis } from '@shared/services/policy.service';

type RGB = readonly [number, number, number];

/** Aligns with policy library detail UI (cards, badges, analysis strips). */
const THEME = {
  purple: [102, 126, 234] as RGB,
  pink: [240, 147, 251] as RGB,
  coral: [245, 87, 108] as RGB,
  cyan: [79, 172, 254] as RGB,
  primary: [13, 110, 253] as RGB,
  success: [25, 135, 84] as RGB,
  danger: [220, 53, 69] as RGB,
  warning: [255, 193, 7] as RGB,
  ink: [33, 37, 41] as RGB,
  muted: [108, 117, 125] as RGB,
  bgLight: [248, 249, 250] as RGB,
  white: [255, 255, 255] as RGB,
  primaryTint: [207, 226, 255] as RGB,
  successTint: [209, 231, 221] as RGB,
  dangerTint: [248, 215, 218] as RGB,
  keyFindingTint: [226, 235, 255] as RGB,
} as const;

function safeBasename(policy: Policy): string {
  const raw = policy._id.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 32);
  const stamp = new Date().toISOString().slice(0, 10);
  return `policy-${raw || 'export'}-${stamp}`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function formatCountry(policy: Policy): string {
  const c = policy.country;
  if (c == null) return '';
  if (typeof c === 'object' && '_id' in c) {
    return (c as { label?: string }).label || (c as { _id: string })._id;
  }
  return String(c);
}

function initiativeTitle(i: {
  englishName?: string;
  originalName?: string;
}): string {
  return (i.englishName || i.originalName || '').trim() || 'Initiative';
}

export function getPolicyAssessmentsArray(policy: Policy): Array<{
  _id: string;
  title: string;
  description?: string;
  fullName?: string;
  status?: string;
  questions?: Array<{ _id?: string; question: string; answer?: string }>;
}> {
  const a = policy.assessments;
  if (!a) return [];
  if (Array.isArray(a)) return a;
  if (typeof a === 'object' && 'data' in a && Array.isArray(a.data)) {
    return a.data;
  }
  return [];
}

// --- PDF --------------------------------------------------------------------

type PdfBlock =
  | { k: 'cover'; exportedAt: string; policyId: string }
  | { k: 'section'; title: string }
  | { k: 'pill'; text: string }
  | { k: 'overview-rows'; rows: { label: string; value: string }[] }
  | { k: 'factor-card'; title: string; description?: string }
  | { k: 'metrics3'; score: string; level: string; confidence: string }
  | { k: 'summary-panel'; text: string }
  | { k: 'domain-header'; title: string; score: string; priority: string }
  | { k: 'tone-label'; title: string; tone: 'success' | 'danger' | 'primary' }
  | { k: 'accent-paragraph'; text: string; accent: RGB }
  | { k: 'paragraph'; text: string }
  | { k: 'finding'; text: string }
  | { k: 'risk'; severity: string; risk: string; mitigation: string }
  | { k: 'next-steps-head' }
  | {
      k: 'next-step-row';
      step: string;
      priority: string;
      owner: string;
      timeline: string;
    }
  | { k: 'assessment-head'; title: string; status?: string }
  | { k: 'qa'; question: string; answer: string }
  | { k: 'initiative'; title: string; meta: string; narrative?: string }
  | { k: 'small-muted'; text: string };

interface PdfState {
  doc: jsPDF;
  y: number;
  readonly margin: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
}

function pdfContentWidth(s: PdfState): number {
  return s.pageWidth - s.margin * 2;
}

function pdfEnsure(s: PdfState, needBottom: number): void {
  if (s.y + needBottom > s.pageHeight - s.margin) {
    s.doc.addPage();
    s.y = s.margin;
  }
}

function pdfSetFill(doc: jsPDF, rgb: RGB): void {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}

function pdfSetText(doc: jsPDF, rgb: RGB): void {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function pdfResetInk(doc: jsPDF): void {
  pdfSetText(doc, THEME.ink);
}

/** Corner radii (pt) — keeps exports aligned with rounded UI cards */
const PDF_RADIUS = {
  hero: 14,
  card: 9,
  row: 8,
  chip: 7,
  metric: 11,
  sectionBar: 3,
} as const;

function pdfRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  style: 'F' | 'S' | 'FD',
  r: number,
): void {
  const radius = Math.min(Math.max(r, 0), w / 2, h / 2);
  doc.roundedRect(x, y, w, h, radius, radius, style);
}

function pdfHairlineBorder(doc: jsPDF, rr = 236, gg = 236, bb = 236): void {
  doc.setDrawColor(rr, gg, bb);
  doc.setLineWidth(0.65);
}

/** Rounded card fill plus left accent strip (detail-page style). */
function pdfRoundedCardWithAccent(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fillRgb: RGB,
  accentRgb: RGB,
  accentW: number,
  cornerR: number,
): void {
  pdfSetFill(doc, fillRgb);
  pdfRoundedRect(doc, x, y, w, h, 'F', cornerR);
  pdfSetFill(doc, accentRgb);
  const stripR = Math.min(accentW / 2 + 0.5, cornerR, h / 2);
  doc.roundedRect(x, y, accentW, h, stripR, stripR, 'F');
}

function pdfBaseline(top: number, fontSize: number): number {
  return top + fontSize * 0.78;
}

function pdfDrawWrapped(
  s: PdfState,
  text: string,
  x: number,
  maxWidth: number,
  fontSize: number,
  lineSpacing = 1.28,
): number {
  const doc = s.doc;
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidth);
  const lh = fontSize * lineSpacing;
  let used = 0;
  for (let i = 0; i < lines.length; i++) {
    pdfEnsure(s, lh + 4);
    doc.text(lines[i] as string, x, pdfBaseline(s.y, fontSize));
    s.y += lh;
    used += lh;
  }
  return used;
}

function buildPdfBlocks(policy: Policy): PdfBlock[] {
  const blocks: PdfBlock[] = [
    {
      k: 'cover',
      exportedAt: new Date().toLocaleString(),
      policyId: policy._id,
    },
    { k: 'section', title: 'Policy overview' },
  ];

  const rows: { label: string; value: string }[] = [];
  const country = formatCountry(policy);
  if (country) rows.push({ label: 'Country', value: country });
  if (policy.sector) rows.push({ label: 'Sector', value: policy.sector });
  if (policy.organizationSize) {
    rows.push({ label: 'Organization size', value: policy.organizationSize });
  }
  if (policy.riskAppetite) {
    rows.push({ label: 'Risk appetite', value: policy.riskAppetite });
  }
  if (policy.implementationTimeline) {
    rows.push({
      label: 'Implementation timeline',
      value: policy.implementationTimeline,
    });
  }
  if (policy.createdAt) {
    rows.push({
      label: 'Created',
      value: new Date(policy.createdAt).toLocaleString(),
    });
  }
  if (policy.updatedAt) {
    rows.push({
      label: 'Last modified',
      value: new Date(policy.updatedAt).toLocaleString(),
    });
  }
  if (rows.length) blocks.push({ k: 'overview-rows', rows });

  if (policy.analysisType) {
    blocks.push({
      k: 'pill',
      text:
        policy.analysisType === 'detailed' ? 'Detailed analysis' : 'Quick analysis',
    });
  }

  if (policy.domains?.length) {
    blocks.push({ k: 'section', title: 'Factors' });
    for (const d of policy.domains) {
      blocks.push({
        k: 'factor-card',
        title: d.title,
        description: d.description?.trim() || undefined,
      });
    }
  }

  const analysis = policy.analysis;
  if (analysis) {
    blocks.push({ k: 'section', title: 'Readiness analysis' });

    const overall = analysis.overallReadiness;
    if (overall) {
      blocks.push({
        k: 'metrics3',
        score: String(overall.score),
        level: overall.level,
        confidence: overall.confidenceLevel,
      });
      blocks.push({ k: 'summary-panel', text: overall.summary });
    }

    if (analysis.domainAssessments?.length) {
      blocks.push({ k: 'section', title: 'Factor assessments' });
      for (const d of analysis.domainAssessments) {
        blocks.push({
          k: 'domain-header',
          title: d.domainTitle,
          score: `Score ${d.readinessScore}`,
          priority: d.priorityLevel,
        });
        if (d.strengths?.length) {
          blocks.push({ k: 'tone-label', title: 'Strengths', tone: 'success' });
          for (const x of d.strengths) {
            blocks.push({
              k: 'accent-paragraph',
              text: `${x.finding}\n${x.evidence}`,
              accent: THEME.success,
            });
          }
        }
        if (d.weaknesses?.length) {
          blocks.push({ k: 'tone-label', title: 'Weaknesses', tone: 'danger' });
          for (const x of d.weaknesses) {
            blocks.push({
              k: 'accent-paragraph',
              text: `[${x.impact}] ${x.finding}\n${x.evidence}`,
              accent: THEME.danger,
            });
          }
        }
        if (d.recommendations?.length) {
          blocks.push({
            k: 'tone-label',
            title: 'Recommendations',
            tone: 'primary',
          });
          for (const r of d.recommendations) {
            blocks.push({
              k: 'accent-paragraph',
              text: `[${r.priority} · ${r.timeline}] ${r.action}\nResources: ${r.resourcesNeeded}\nImpact: ${r.expectedImpact}`,
              accent: THEME.primary,
            });
          }
        }
        if (d.detailedAnalysis?.trim()) {
          blocks.push({ k: 'tone-label', title: 'Detailed analysis', tone: 'primary' });
          blocks.push({ k: 'paragraph', text: d.detailedAnalysis });
        }
      }
    }

    if (analysis.crossCuttingThemes?.length) {
      blocks.push({ k: 'section', title: 'Cross-cutting themes' });
      for (const t of analysis.crossCuttingThemes) {
        blocks.push({
          k: 'accent-paragraph',
          text: `${t.theme}\n${t.description}\nAffected: ${t.affectedDomains?.join(', ') ?? '—'}`,
          accent: THEME.purple,
        });
      }
    }

    if (analysis.keyFindings?.length) {
      blocks.push({ k: 'section', title: 'Key findings' });
      for (const f of analysis.keyFindings) {
        blocks.push({ k: 'finding', text: f });
      }
    }

    if (analysis.riskFactors?.length) {
      blocks.push({ k: 'section', title: 'Risk factors' });
      for (const r of analysis.riskFactors) {
        blocks.push({
          k: 'risk',
          severity: r.severity,
          risk: r.risk,
          mitigation: r.mitigationStrategy,
        });
      }
    }

    if (analysis.nextSteps?.length) {
      blocks.push({ k: 'section', title: 'Next steps' });
      blocks.push({ k: 'next-steps-head' });
      for (const n of analysis.nextSteps) {
        blocks.push({
          k: 'next-step-row',
          step: n.step,
          priority: n.priority,
          owner: n.owner,
          timeline: n.timeline,
        });
      }
    }
  }

  if (policy.analysisMetadata && analysis) {
    blocks.push({ k: 'section', title: 'Analysis metadata' });
    const m = policy.analysisMetadata;
    blocks.push({
      k: 'paragraph',
      text: `Domains: ${m.totalDomains} · Assessments: ${m.totalAssessments} · Questions: ${m.totalQuestions}`,
    });
    blocks.push({
      k: 'paragraph',
      text: `Model: ${m.model} · Tokens: ${m.tokensUsed} (in ${m.tokensInput}) · Strategy: ${m.analysisStrategy}`,
    });
    if (m.analyzedAt) {
      blocks.push({
        k: 'paragraph',
        text: `Analyzed at: ${new Date(m.analyzedAt).toLocaleString()}`,
      });
    }
  }

  const assessments = getPolicyAssessmentsArray(policy);
  if (assessments.length) {
    blocks.push({ k: 'section', title: 'Assessments' });
    for (const a of assessments) {
      blocks.push({
        k: 'assessment-head',
        title: a.title,
        status: a.status,
      });
      if (a.description?.trim()) blocks.push({ k: 'paragraph', text: a.description });
      if (a.fullName?.trim()) {
        blocks.push({
          k: 'small-muted',
          text: `Respondent: ${a.fullName}`,
        });
      }
      if (a.questions?.length) {
        for (const q of a.questions) {
          blocks.push({
            k: 'qa',
            question: q.question,
            answer: q.answer?.trim() || 'No answer provided',
          });
        }
      } else {
        blocks.push({
          k: 'small-muted',
          text: 'No questions recorded.',
        });
      }
    }
  }

  if (policy.initiatives?.length) {
    blocks.push({ k: 'section', title: 'Governance initiatives' });
    for (const i of policy.initiatives) {
      const metaBits: string[] = [];
      if (i.category) metaBits.push(i.category);
      if (i.status) metaBits.push(i.status);
      blocks.push({
        k: 'initiative',
        title: initiativeTitle(i),
        meta: metaBits.join(' · '),
        narrative: i.description?.trim() || i.overview?.trim() || undefined,
      });
    }
  }

  return blocks;
}

function pdfRenderBlock(s: PdfState, b: PdfBlock): void {
  const doc = s.doc;
  const w = pdfContentWidth(s);
  const m = s.margin;

  switch (b.k) {
    case 'cover': {
      pdfEnsure(s, 120);
      const heroW = s.pageWidth - m * 2;
      const heroH = 96;
      pdfSetFill(doc, THEME.purple);
      pdfRoundedRect(doc, m, s.y, heroW, heroH, 'F', PDF_RADIUS.hero);
      pdfSetText(doc, THEME.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('AI Policy Report', m + 4, pdfBaseline(s.y + 28, 24));
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Exported ${b.exportedAt}`, m + 4, pdfBaseline(s.y + 52, 10));
      doc.text(`Policy ID: ${b.policyId}`, m + 4, pdfBaseline(s.y + 68, 10));
      pdfResetInk(doc);
      s.y += 112;
      break;
    }
    case 'section': {
      pdfEnsure(s, 36);
      const bar = 5;
      const h = 22;
      pdfSetFill(doc, THEME.primary);
      pdfRoundedRect(doc, m, s.y, bar, h, 'F', PDF_RADIUS.sectionBar);
      pdfSetText(doc, THEME.primary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(b.title, m + bar + 10, pdfBaseline(s.y + 4, 15));
      pdfResetInk(doc);
      s.y += h + 14;
      break;
    }
    case 'pill': {
      pdfEnsure(s, 28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const padX = 12;
      const pillH = 20;
      const tw = doc.getTextWidth(b.text);
      const pillW = tw + padX * 2;
      pdfSetFill(doc, THEME.primaryTint);
      pdfRoundedRect(doc, m, s.y, pillW, pillH, 'F', pillH / 2);
      pdfSetText(doc, THEME.primary);
      doc.text(b.text, m + padX, pdfBaseline(s.y + 4, 9));
      pdfResetInk(doc);
      s.y += pillH + 12;
      break;
    }
    case 'overview-rows': {
      for (const row of b.rows) {
        const labelW = 132;
        const valueMaxW = w - labelW - 16;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const valueLines = doc.splitTextToSize(row.value, valueMaxW);
        const labelLines = doc.splitTextToSize(row.label + ':', labelW - 8);
        const lines = Math.max(valueLines.length, labelLines.length);
        const rowH = Math.max(24, lines * 11 + 14);
        pdfEnsure(s, rowH + 6);
        pdfRoundedCardWithAccent(
          doc,
          m,
          s.y,
          w,
          rowH,
          THEME.bgLight,
          THEME.primary,
          4,
          PDF_RADIUS.row,
        );
        let ty = s.y + 12;
        pdfSetText(doc, THEME.muted);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        for (let i = 0; i < labelLines.length; i++) {
          doc.text(labelLines[i] as string, m + 12, pdfBaseline(ty, 9));
          ty += 11;
        }
        pdfResetInk(doc);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        let vy = s.y + 12;
        for (let i = 0; i < valueLines.length; i++) {
          doc.text(valueLines[i] as string, m + labelW, pdfBaseline(vy, 10));
          vy += 12;
        }
        s.y += rowH + 6;
      }
      break;
    }
    case 'factor-card': {
      pdfEnsure(s, 40);
      const innerPad = 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const titleLines = doc.splitTextToSize(b.title, w - innerPad * 2 - 8);
      let extra = (b.description
        ? doc.splitTextToSize(b.description, w - innerPad * 2 - 8).length
        : 0) * 11;
      const boxH = 16 + titleLines.length * 12 + extra + (b.description ? 10 : 0);
      pdfEnsure(s, boxH + 10);
      pdfRoundedCardWithAccent(
        doc,
        m,
        s.y,
        w,
        boxH,
        THEME.white,
        THEME.primary,
        4,
        PDF_RADIUS.card,
      );
      pdfHairlineBorder(doc);
      pdfRoundedRect(doc, m, s.y, w, boxH, 'S', PDF_RADIUS.card);
      pdfResetInk(doc);
      let ty = s.y + innerPad + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      for (const ln of titleLines) {
        doc.text(ln as string, m + innerPad + 6, pdfBaseline(ty, 11));
        ty += 12;
      }
      if (b.description) {
        pdfSetText(doc, THEME.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const descLines = doc.splitTextToSize(b.description, w - innerPad * 2 - 8);
        for (const ln of descLines) {
          doc.text(ln as string, m + innerPad + 6, pdfBaseline(ty + 2, 9));
          ty += 11;
        }
        pdfResetInk(doc);
      }
      s.y += boxH + 10;
      break;
    }
    case 'metrics3': {
      const gap = 10;
      const cardW = (w - gap * 2) / 3;
      const cardH = 76;
      pdfEnsure(s, cardH + 16);
      const palette: RGB[] = [THEME.purple, THEME.coral, THEME.cyan];
      const labels = ['Readiness score', 'Readiness level', 'Confidence'];
      const values = [b.score, b.level, b.confidence];
      for (let i = 0; i < 3; i++) {
        const x = m + i * (cardW + gap);
        pdfSetFill(doc, palette[i]);
        pdfRoundedRect(doc, x, s.y, cardW, cardH, 'F', PDF_RADIUS.metric);
        pdfSetText(doc, THEME.white);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(labels[i], x + cardW / 2, pdfBaseline(s.y + 14, 8), {
          align: 'center',
        });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(i === 0 ? 22 : 14);
        const vl = doc.splitTextToSize(values[i], cardW - 12);
        let vy = s.y + 38;
        for (const line of vl) {
          doc.text(line as string, x + cardW / 2, pdfBaseline(vy, i === 0 ? 22 : 14), {
            align: 'center',
          });
          vy += (i === 0 ? 26 : 18);
        }
      }
      pdfResetInk(doc);
      s.y += cardH + 18;
      break;
    }
    case 'summary-panel': {
      const pad = 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(b.text, w - pad * 2);
      const boxH = pad * 2 + lines.length * 13;
      pdfEnsure(s, boxH + 12);
      pdfRoundedCardWithAccent(
        doc,
        m,
        s.y,
        w,
        boxH,
        THEME.bgLight,
        THEME.primary,
        4,
        PDF_RADIUS.card,
      );
      pdfResetInk(doc);
      let ty = s.y + pad + 10;
      for (const ln of lines) {
        doc.text(ln as string, m + pad + 6, pdfBaseline(ty, 10));
        ty += 13;
      }
      s.y += boxH + 14;
      break;
    }
    case 'domain-header': {
      pdfEnsure(s, 36);
      const boxH = 30;
      pdfRoundedCardWithAccent(
        doc,
        m,
        s.y,
        w,
        boxH,
        THEME.white,
        THEME.primary,
        4,
        PDF_RADIUS.card,
      );
      pdfHairlineBorder(doc);
      pdfRoundedRect(doc, m, s.y, w, boxH, 'S', PDF_RADIUS.card);
      pdfResetInk(doc);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(b.title, m + 12, pdfBaseline(s.y + 12, 12));
      const bx = m + w - 150;
      pdfSetFill(doc, THEME.primaryTint);
      pdfRoundedRect(doc, bx, s.y + 8, 52, 16, 'F', PDF_RADIUS.chip);
      pdfSetText(doc, THEME.primary);
      doc.setFontSize(8);
      doc.text(b.score, bx + 26, pdfBaseline(s.y + 12, 8), { align: 'center' });
      pdfSetFill(doc, THEME.bgLight);
      pdfRoundedRect(doc, bx + 58, s.y + 8, 86, 16, 'F', PDF_RADIUS.chip);
      pdfSetText(doc, THEME.warning);
      doc.text(b.priority, bx + 101, pdfBaseline(s.y + 12, 8), { align: 'center' });
      pdfResetInk(doc);
      s.y += boxH + 12;
      break;
    }
    case 'tone-label': {
      const rgb =
        b.tone === 'success'
          ? THEME.success
          : b.tone === 'danger'
            ? THEME.danger
            : THEME.primary;
      pdfEnsure(s, 22);
      pdfSetText(doc, rgb);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(b.title, m, pdfBaseline(s.y + 4, 11));
      pdfResetInk(doc);
      s.y += 20;
      break;
    }
    case 'accent-paragraph': {
      const pad = 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const innerW = w - pad * 2 - 10;
      const lines = doc.splitTextToSize(b.text, innerW);
      const boxH = pad * 2 + lines.length * 11;
      pdfEnsure(s, boxH + 8);
      const tint: RGB =
        b.accent === THEME.success
          ? THEME.successTint
          : b.accent === THEME.danger
            ? THEME.dangerTint
            : b.accent === THEME.purple
              ? THEME.keyFindingTint
              : THEME.primaryTint;
      pdfRoundedCardWithAccent(
        doc,
        m,
        s.y,
        w,
        boxH,
        tint,
        b.accent,
        4,
        PDF_RADIUS.card,
      );
      pdfResetInk(doc);
      let ty = s.y + pad + 8;
      for (const ln of lines) {
        doc.text(ln as string, m + pad + 6, pdfBaseline(ty, 9));
        ty += 11;
      }
      s.y += boxH + 10;
      break;
    }
    case 'paragraph': {
      pdfEnsure(s, 24);
      doc.setFont('helvetica', 'normal');
      pdfDrawWrapped(s, b.text, m, w, 10);
      s.y += 6;
      break;
    }
    case 'finding': {
      const pad = 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const bulletLeading = 14;
      const lines = doc.splitTextToSize(b.text, w - pad * 2 - bulletLeading);
      const boxH = pad * 2 + lines.length * 12;
      pdfEnsure(s, boxH + 10);
      pdfSetFill(doc, THEME.keyFindingTint);
      pdfRoundedRect(doc, m, s.y, w, boxH, 'F', PDF_RADIUS.card);
      pdfHairlineBorder(doc, 220, 226, 243);
      pdfRoundedRect(doc, m, s.y, w, boxH, 'S', PDF_RADIUS.card);
      const firstBaseline = pdfBaseline(s.y + pad + 10, 10);
      const bulletR = 2.6;
      pdfSetFill(doc, THEME.primary);
      doc.circle(m + pad + 5, firstBaseline - 3.2, bulletR, 'F');
      pdfResetInk(doc);
      let ty = s.y + pad + 10;
      for (const ln of lines) {
        doc.text(ln as string, m + pad + bulletLeading, pdfBaseline(ty, 10));
        ty += 12;
      }
      s.y += boxH + 10;
      break;
    }
    case 'risk': {
      const pad = 12;
      const inner = 6;
      const maxW = Math.max(40, w - pad * 2 - inner * 2 - 4);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const top = `[${b.severity}] ${b.risk}`;
      const l1 = doc.splitTextToSize(top, maxW);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const mit = `Mitigation: ${b.mitigation}`;
      const l2 = doc.splitTextToSize(mit, maxW);

      const boxH = pad * 2 + l1.length * 12 + l2.length * 11 + 6;
      pdfEnsure(s, boxH + 10);
      pdfRoundedCardWithAccent(
        doc,
        m,
        s.y,
        w,
        boxH,
        THEME.dangerTint,
        THEME.danger,
        4,
        PDF_RADIUS.card,
      );
      pdfResetInk(doc);
      let ty = s.y + pad + 10;
      pdfSetText(doc, THEME.danger);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      for (const ln of l1) {
        doc.text(ln as string, m + pad + inner, pdfBaseline(ty, 10));
        ty += 12;
      }
      doc.setFont('helvetica', 'normal');
      pdfSetText(doc, THEME.muted);
      doc.setFontSize(9);
      for (const ln of l2) {
        doc.text(ln as string, m + pad + inner, pdfBaseline(ty + 2, 9));
        ty += 11;
      }
      pdfResetInk(doc);
      s.y += boxH + 10;
      break;
    }
    case 'next-steps-head': {
      pdfEnsure(s, 26);
      pdfRoundedCardWithAccent(
        doc,
        m,
        s.y,
        w,
        22,
        THEME.bgLight,
        THEME.primary,
        4,
        PDF_RADIUS.row,
      );
      pdfResetInk(doc);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const cols = ['Step', 'Priority', 'Owner', 'Timeline'];
      const cw = [w * 0.42, w * 0.14, w * 0.22, w * 0.22];
      let cx = m + 10;
      for (let i = 0; i < cols.length; i++) {
        doc.text(cols[i], cx, pdfBaseline(s.y + 12, 9));
        cx += cw[i];
      }
      s.y += 28;
      break;
    }
    case 'next-step-row': {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const cw = [w * 0.42, w * 0.14, w * 0.22, w * 0.22];
      const lineH = 11;
      const inset = 4;
      const textPad = 12;
      const xStep = m + 10;
      const xPri = m + 10 + cw[0] + inset;
      const xOwn = m + 10 + cw[0] + cw[1] + inset;
      const xTime = m + 10 + cw[0] + cw[1] + cw[2] + inset;

      const stepLines = doc.splitTextToSize(b.step, cw[0] - textPad);
      const priLines = doc.splitTextToSize(b.priority, cw[1] - textPad);
      const ownerLines = doc.splitTextToSize(b.owner, cw[2] - textPad);
      const timeLines = doc.splitTextToSize(b.timeline, cw[3] - textPad);

      const maxLines = Math.max(
        1,
        stepLines.length,
        priLines.length,
        ownerLines.length,
        timeLines.length,
      );
      const rowH = Math.max(26, maxLines * lineH + 16);

      pdfEnsure(s, rowH + 4);
      pdfSetFill(doc, THEME.white);
      pdfRoundedRect(doc, m, s.y, w, rowH, 'F', PDF_RADIUS.row);
      pdfHairlineBorder(doc, 236, 236, 236);
      pdfRoundedRect(doc, m, s.y, w, rowH, 'S', PDF_RADIUS.row);

      const baseTop = s.y + 12;

      for (let i = 0; i < stepLines.length; i++) {
        doc.text(stepLines[i] as string, xStep, pdfBaseline(baseTop + i * lineH, 9));
      }

      pdfSetText(doc, THEME.primary);
      doc.setFont('helvetica', 'bold');
      for (let i = 0; i < priLines.length; i++) {
        doc.text(priLines[i] as string, xPri, pdfBaseline(baseTop + i * lineH, 9));
      }
      pdfResetInk(doc);
      doc.setFont('helvetica', 'normal');

      for (let i = 0; i < ownerLines.length; i++) {
        doc.text(ownerLines[i] as string, xOwn, pdfBaseline(baseTop + i * lineH, 9));
      }
      for (let i = 0; i < timeLines.length; i++) {
        doc.text(timeLines[i] as string, xTime, pdfBaseline(baseTop + i * lineH, 9));
      }

      s.y += rowH + 4;
      break;
    }
    case 'assessment-head': {
      pdfEnsure(s, 32);
      pdfRoundedCardWithAccent(
        doc,
        m,
        s.y,
        w,
        28,
        THEME.white,
        THEME.primary,
        4,
        PDF_RADIUS.card,
      );
      pdfHairlineBorder(doc);
      pdfRoundedRect(doc, m, s.y, w, 28, 'S', PDF_RADIUS.card);
      pdfResetInk(doc);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(b.title, m + 12, pdfBaseline(s.y + 14, 11));
      if (b.status) {
        const sw = doc.getTextWidth(b.status) + 14;
        pdfSetFill(doc, THEME.successTint);
        pdfRoundedRect(doc, m + w - sw - 14, s.y + 7, sw, 16, 'F', PDF_RADIUS.chip);
        pdfSetText(doc, THEME.success);
        doc.setFontSize(8);
        doc.text(b.status, m + w - sw / 2 - 14, pdfBaseline(s.y + 14, 8), {
          align: 'center',
        });
        pdfResetInk(doc);
      }
      s.y += 34;
      break;
    }
    case 'qa': {
      const pad = 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const qLines = doc.splitTextToSize(`Q: ${b.question}`, w - pad * 2 - 8);
      doc.setFontSize(9);
      const aLines = doc.splitTextToSize(`A: ${b.answer}`, w - pad * 2 - 8);
      const boxH = pad * 2 + qLines.length * 11 + aLines.length * 11 + 8;
      pdfEnsure(s, boxH + 8);
      pdfSetFill(doc, THEME.bgLight);
      pdfRoundedRect(doc, m, s.y, w, boxH, 'F', PDF_RADIUS.card);
      pdfHairlineBorder(doc, 230, 233, 237);
      pdfRoundedRect(doc, m, s.y, w, boxH, 'S', PDF_RADIUS.card);
      let ty = s.y + pad + 8;
      pdfSetText(doc, THEME.primary);
      doc.setFont('helvetica', 'bold');
      for (const ln of qLines) {
        doc.text(ln as string, m + pad + 4, pdfBaseline(ty, 9));
        ty += 11;
      }
      pdfSetText(doc, THEME.success);
      doc.setFont('helvetica', 'bold');
      for (const ln of aLines) {
        doc.text(ln as string, m + pad + 4, pdfBaseline(ty + 2, 9));
        ty += 11;
      }
      pdfResetInk(doc);
      s.y += boxH + 10;
      break;
    }
    case 'initiative': {
      const pad = 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const meta = b.meta ? ` · ${b.meta}` : '';
      const titleLine = b.title + meta;
      const tLines = doc.splitTextToSize(titleLine, w - pad * 2 - 8);
      let narrativeH = 0;
      let narLines: string[] = [];
      if (b.narrative) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        narLines = doc.splitTextToSize(b.narrative, w - pad * 2 - 8);
        narrativeH = narLines.length * 11 + 8;
      }
      const boxH = pad * 2 + tLines.length * 12 + narrativeH;
      pdfEnsure(s, boxH + 10);
      pdfRoundedCardWithAccent(
        doc,
        m,
        s.y,
        w,
        boxH,
        THEME.white,
        THEME.primary,
        4,
        PDF_RADIUS.card,
      );
      pdfHairlineBorder(doc, 222, 226, 230);
      pdfRoundedRect(doc, m, s.y, w, boxH, 'S', PDF_RADIUS.card);
      pdfResetInk(doc);
      let ty = s.y + pad + 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      for (const ln of tLines) {
        doc.text(ln as string, m + pad + 6, pdfBaseline(ty, 11));
        ty += 12;
      }
      if (b.narrative) {
        pdfSetText(doc, THEME.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        for (const ln of narLines) {
          doc.text(ln as string, m + pad + 6, pdfBaseline(ty + 2, 9));
          ty += 11;
        }
        pdfResetInk(doc);
      }
      s.y += boxH + 10;
      break;
    }
    case 'small-muted': {
      pdfEnsure(s, 16);
      pdfSetText(doc, THEME.muted);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      pdfDrawWrapped(s, b.text, m, w, 9);
      pdfResetInk(doc);
      doc.setFont('helvetica', 'normal');
      s.y += 4;
      break;
    }
    default:
      break;
  }
}

export function exportPolicyToPdf(policy: Policy): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const state: PdfState = {
    doc,
    y: margin,
    margin,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
  };
  for (const block of buildPdfBlocks(policy)) {
    pdfRenderBlock(state, block);
  }
  triggerBlobDownload(doc.output('blob'), `${safeBasename(policy)}.pdf`);
}

// --- DOCX (colored headings + tinted panels + metric table) ---------------

const HEX = {
  purple: '667EEA',
  primary: '0D6EFD',
  success: '198754',
  danger: 'DC3545',
  muted: '6C757D',
  ink: '212529',
  primaryTint: 'CFE2FF',
  successTint: 'D1E7DD',
  dangerTint: 'F8D7DA',
  findingTint: 'E7F1FF',
  bgLight: 'F8F9FA',
} as const;

function docxBorderLeft(color: string) {
  return {
    left: {
      color,
      space: 1,
      style: BorderStyle.SINGLE,
      size: 24,
    },
  };
}

function docxShadedParagraph(text: string, fill: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: HEX.ink })],
    shading: {
      type: ShadingType.CLEAR,
      fill,
      color: 'auto',
    },
    spacing: { after: 140 },
    border: docxBorderLeft(HEX.primary),
  });
}

function docxSectionTitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32,
        color: HEX.primary,
      }),
    ],
    spacing: { before: 280, after: 160 },
  });
}

function docxSubTitle(text: string, colorHex: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, color: colorHex })],
    spacing: { before: 200, after: 120 },
  });
}

function docxBuild(policy: Policy): Array<Paragraph | Table> {
  const out: Array<Paragraph | Table> = [];

  out.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'AI Policy Report',
          bold: true,
          size: 56,
          color: HEX.purple,
        }),
      ],
      spacing: { after: 120 },
    }),
  );
  out.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Exported ${new Date().toLocaleString()} · ID ${policy._id}`,
          size: 22,
          color: HEX.muted,
        }),
      ],
      spacing: { after: 240 },
    }),
  );

  out.push(docxSectionTitle('Policy overview'));
  const country = formatCountry(policy);
  if (country) {
    out.push(
      docxShadedParagraph(`Country: ${country}`, HEX.bgLight),
    );
  }
  if (policy.sector) {
    out.push(docxShadedParagraph(`Sector: ${policy.sector}`, HEX.bgLight));
  }
  if (policy.organizationSize) {
    out.push(
      docxShadedParagraph(
        `Organization size: ${policy.organizationSize}`,
        HEX.bgLight,
      ),
    );
  }
  if (policy.riskAppetite) {
    out.push(
      docxShadedParagraph(`Risk appetite: ${policy.riskAppetite}`, HEX.bgLight),
    );
  }
  if (policy.implementationTimeline) {
    out.push(
      docxShadedParagraph(
        `Implementation timeline: ${policy.implementationTimeline}`,
        HEX.bgLight,
      ),
    );
  }
  if (policy.createdAt) {
    out.push(
      docxShadedParagraph(
        `Created: ${new Date(policy.createdAt).toLocaleString()}`,
        HEX.bgLight,
      ),
    );
  }
  if (policy.updatedAt) {
    out.push(
      docxShadedParagraph(
        `Last modified: ${new Date(policy.updatedAt).toLocaleString()}`,
        HEX.bgLight,
      ),
    );
  }

  if (policy.analysisType) {
    out.push(
      new Paragraph({
        children: [
          new TextRun({
            text:
              policy.analysisType === 'detailed'
                ? 'Detailed analysis'
                : 'Quick analysis',
            bold: true,
            size: 22,
            color: HEX.primary,
          }),
        ],
        shading: {
          type: ShadingType.CLEAR,
          fill: HEX.primaryTint,
          color: 'auto',
        },
        spacing: { before: 120, after: 160 },
      }),
    );
  }

  if (policy.domains?.length) {
    out.push(docxSectionTitle('Factors'));
    for (const d of policy.domains) {
      const body = d.description?.trim()
        ? `${d.title}\n${d.description.trim()}`
        : d.title;
      out.push(docxShadedParagraph(body, HEX.bgLight));
    }
  }

  const analysis = policy.analysis;
  if (analysis) {
    out.push(docxSectionTitle('Readiness analysis'));

    const overall = analysis.overallReadiness;
    if (overall) {
      out.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: {
                    type: ShadingType.CLEAR,
                    fill: HEX.purple,
                    color: 'auto',
                  },
                  margins: { marginUnitType: WidthType.DXA, top: 120, bottom: 120, left: 120, right: 120 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: 'Readiness score',
                          size: 18,
                          color: 'FFFFFF',
                        }),
                      ],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: String(overall.score),
                          bold: true,
                          size: 44,
                          color: 'FFFFFF',
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  shading: {
                    type: ShadingType.CLEAR,
                    fill: 'F5576C',
                    color: 'auto',
                  },
                  margins: { marginUnitType: WidthType.DXA, top: 120, bottom: 120, left: 120, right: 120 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: 'Readiness level',
                          size: 18,
                          color: 'FFFFFF',
                        }),
                      ],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: overall.level,
                          bold: true,
                          size: 36,
                          color: 'FFFFFF',
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  shading: {
                    type: ShadingType.CLEAR,
                    fill: '4FACFE',
                    color: 'auto',
                  },
                  margins: { marginUnitType: WidthType.DXA, top: 120, bottom: 120, left: 120, right: 120 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: 'Confidence',
                          size: 18,
                          color: 'FFFFFF',
                        }),
                      ],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: overall.confidenceLevel,
                          bold: true,
                          size: 32,
                          color: 'FFFFFF',
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      );
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Summary: ${overall.summary}`,
              size: 22,
              color: HEX.ink,
            }),
          ],
          shading: {
            type: ShadingType.CLEAR,
            fill: HEX.bgLight,
            color: 'auto',
          },
          spacing: { before: 160, after: 200 },
          border: docxBorderLeft(HEX.primary),
        }),
      );
    }

    appendAnalysisDocx(out, analysis);
  }

  if (policy.analysisMetadata && analysis) {
    out.push(docxSectionTitle('Analysis metadata'));
    const m = policy.analysisMetadata;
    out.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Domains: ${m.totalDomains} · Assessments: ${m.totalAssessments} · Questions: ${m.totalQuestions}`,
            size: 22,
          }),
        ],
        spacing: { after: 100 },
      }),
    );
    out.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Model: ${m.model} · Tokens: ${m.tokensUsed} (in ${m.tokensInput}) · Strategy: ${m.analysisStrategy}`,
            size: 22,
          }),
        ],
        spacing: { after: 100 },
      }),
    );
    if (m.analyzedAt) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Analyzed at: ${new Date(m.analyzedAt).toLocaleString()}`,
              size: 22,
            }),
          ],
        }),
      );
    }
  }

  const assessments = getPolicyAssessmentsArray(policy);
  if (assessments.length) {
    out.push(docxSectionTitle('Assessments'));
    for (const a of assessments) {
      const badge = a.status ? ` (${a.status})` : '';
      out.push(docxSubTitle(`${a.title}${badge}`, HEX.primary));
      if (a.description?.trim()) {
        out.push(
          new Paragraph({
            children: [
              new TextRun({ text: a.description.trim(), size: 22, color: HEX.muted }),
            ],
            spacing: { after: 100 },
          }),
        );
      }
      if (a.fullName?.trim()) {
        out.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Respondent: ${a.fullName}`,
                italics: true,
                size: 20,
                color: HEX.muted,
              }),
            ],
            spacing: { after: 120 },
          }),
        );
      }
      if (a.questions?.length) {
        for (const q of a.questions) {
          out.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Q: ${q.question}`,
                  bold: true,
                  size: 22,
                  color: HEX.primary,
                }),
              ],
              spacing: { after: 60 },
            }),
          );
          out.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `A: ${q.answer?.trim() || 'No answer provided'}`,
                  size: 22,
                  color: HEX.success,
                }),
              ],
              spacing: { after: 140 },
              shading: {
                type: ShadingType.CLEAR,
                fill: HEX.bgLight,
                color: 'auto',
              },
            }),
          );
        }
      } else {
        out.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'No questions recorded.',
                italics: true,
                size: 22,
                color: HEX.muted,
              }),
            ],
          }),
        );
      }
    }
  }

  if (policy.initiatives?.length) {
    out.push(docxSectionTitle('Governance initiatives'));
    for (const i of policy.initiatives) {
      const metaBits: string[] = [];
      if (i.category) metaBits.push(i.category);
      if (i.status) metaBits.push(i.status);
      const meta = metaBits.join(' · ');
      const title = initiativeTitle(i);
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: meta ? `${title} · ${meta}` : title,
              bold: true,
              size: 24,
              color: HEX.ink,
            }),
          ],
          spacing: { before: 120, after: 80 },
          border: docxBorderLeft(HEX.primary),
          shading: {
            type: ShadingType.CLEAR,
            fill: HEX.bgLight,
            color: 'auto',
          },
        }),
      );
      const narrative = i.description?.trim() || i.overview?.trim();
      if (narrative) {
        out.push(
          new Paragraph({
            children: [
              new TextRun({ text: narrative, size: 22, color: HEX.muted }),
            ],
            spacing: { after: 160 },
          }),
        );
      }
    }
  }

  return out;
}

function appendAnalysisDocx(
  out: Array<Paragraph | Table>,
  analysis: PolicyAnalysis,
): void {
  if (analysis.domainAssessments?.length) {
    out.push(docxSubTitle('Factor assessments', HEX.purple));
    for (const d of analysis.domainAssessments) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${d.domainTitle}   ·   Score ${d.readinessScore}   ·   ${d.priorityLevel}`,
              bold: true,
              size: 24,
              color: HEX.ink,
            }),
          ],
          spacing: { before: 160, after: 120 },
          shading: {
            type: ShadingType.CLEAR,
            fill: HEX.bgLight,
            color: 'auto',
          },
          border: docxBorderLeft(HEX.primary),
        }),
      );
      if (d.strengths?.length) {
        out.push(docxSubTitle('Strengths', HEX.success));
        for (const s of d.strengths) {
          out.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${s.finding}: ${s.evidence}`,
                  size: 22,
                }),
              ],
              shading: {
                type: ShadingType.CLEAR,
                fill: HEX.successTint,
                color: 'auto',
              },
              spacing: { after: 120 },
              border: docxBorderLeft(HEX.success),
            }),
          );
        }
      }
      if (d.weaknesses?.length) {
        out.push(docxSubTitle('Weaknesses', HEX.danger));
        for (const w of d.weaknesses) {
          out.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[${w.impact}] ${w.finding}: ${w.evidence}`,
                  size: 22,
                }),
              ],
              shading: {
                type: ShadingType.CLEAR,
                fill: HEX.dangerTint,
                color: 'auto',
              },
              spacing: { after: 120 },
              border: docxBorderLeft(HEX.danger),
            }),
          );
        }
      }
      if (d.recommendations?.length) {
        out.push(docxSubTitle('Recommendations', HEX.primary));
        for (const r of d.recommendations) {
          out.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[${r.priority} · ${r.timeline}] ${r.action}\nResources: ${r.resourcesNeeded}\nImpact: ${r.expectedImpact}`,
                  size: 22,
                }),
              ],
              shading: {
                type: ShadingType.CLEAR,
                fill: HEX.primaryTint,
                color: 'auto',
              },
              spacing: { after: 140 },
              border: docxBorderLeft(HEX.primary),
            }),
          );
        }
      }
      if (d.detailedAnalysis?.trim()) {
        out.push(docxSubTitle('Detailed analysis', HEX.muted));
        out.push(
          new Paragraph({
            children: [
              new TextRun({ text: d.detailedAnalysis, size: 22 }),
            ],
            spacing: { after: 180 },
          }),
        );
      }
    }
  }

  if (analysis.crossCuttingThemes?.length) {
    out.push(docxSubTitle('Cross-cutting themes', HEX.purple));
    for (const t of analysis.crossCuttingThemes) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${t.theme}: ${t.description} (affected: ${t.affectedDomains?.join(', ') ?? '—'})`,
              size: 22,
            }),
          ],
          shading: {
            type: ShadingType.CLEAR,
            fill: HEX.findingTint,
            color: 'auto',
          },
          spacing: { after: 140 },
          border: docxBorderLeft(HEX.purple),
        }),
      );
    }
  }

  if (analysis.keyFindings?.length) {
    out.push(docxSubTitle('Key findings', HEX.primary));
    for (const f of analysis.keyFindings) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({ text: `\u2022  ${f}`, size: 22, color: HEX.primary }),
          ],
          shading: {
            type: ShadingType.CLEAR,
            fill: HEX.findingTint,
            color: 'auto',
          },
          spacing: { after: 120 },
        }),
      );
    }
  }

  if (analysis.riskFactors?.length) {
    out.push(docxSubTitle('Risk factors', HEX.danger));
    for (const r of analysis.riskFactors) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${r.severity}] ${r.risk}`,
              bold: true,
              size: 22,
              color: HEX.danger,
            }),
          ],
          spacing: { after: 60 },
        }),
      );
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Mitigation: ${r.mitigationStrategy}`,
              size: 22,
              color: HEX.muted,
            }),
          ],
          shading: {
            type: ShadingType.CLEAR,
            fill: HEX.dangerTint,
            color: 'auto',
          },
          spacing: { after: 160 },
          border: docxBorderLeft(HEX.danger),
        }),
      );
    }
  }

  if (analysis.nextSteps?.length) {
    out.push(docxSubTitle('Next steps', HEX.primary));
    out.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: [2100, 700, 1100, 1100],
        rows: [
          new TableRow({
            tableHeader: true,
            children: ['Step', 'Priority', 'Owner', 'Timeline'].map(
              (h) =>
                new TableCell({
                  shading: {
                    type: ShadingType.CLEAR,
                    fill: HEX.bgLight,
                    color: 'auto',
                  },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: h,
                          bold: true,
                          size: 22,
                          color: HEX.primary,
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
          ...analysis.nextSteps.map(
            (n) =>
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: n.step, size: 22 }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: n.priority,
                            bold: true,
                            size: 22,
                            color: HEX.primary,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: n.owner, size: 22 }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({ text: n.timeline, size: 22 }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
          ),
        ],
      }),
    );
  }
}

export async function exportPolicyToDocx(policy: Policy): Promise<void> {
  const doc = new Document({
    sections: [{ children: docxBuild(policy) }],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${safeBasename(policy)}.docx`);
}
