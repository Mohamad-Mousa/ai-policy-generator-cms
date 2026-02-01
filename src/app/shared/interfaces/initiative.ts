export interface GaiinCountry {
  id: number;
  name: string;
  slug: string;
  code: string;
  sortName: string;
  order: number | null;
  language?: string;
  region?: string;
  incomeGroup?: string;
  populationIn2023?: number;
  gdp?: number;
  deletedAt: string | null;
}

export interface InitiativeType {
  id: number;
  name: string;
  order: number;
  category: string;
  isLinkedToAIPrinciple: boolean;
  displayGroup: string | null;
  deletedAt: string | null;
}

export interface InitiativePrinciple {
  id: number;
  name: string;
  type: string;
  order: number;
  deletedAt: string | null;
}

export interface Initiative {
  _id: string;
  apiId?: number;
  actionPlan?: string | null;
  apiCreatedAt?: string;
  apiUpdatedAt?: string;
  budget?: string | null;
  budgetAvailable?: boolean | null;
  category?: string;
  createdAt: string;
  createdByEmail?: string;
  createdByName?: string;
  description?: string;
  editorialStatus?: string;
  endYear?: number | null;
  engagementDescription?: string | null;
  englishName?: string;
  evaluationBy?: string | null;
  evaluationDescription?: string | null;
  evaluationFiles?: unknown[];
  evaluationUrls?: string[];
  extentBinding?: string | null;
  gaiinCountry?: GaiinCountry;
  gaiinCountryId?: number;
  hasMonitoringMechanism?: boolean | null;
  images?: unknown[];
  initiativeType?: InitiativeType;
  intergovernmentalCoordination?: string | null;
  intergovernmentalOrganisation?: string | null;
  intergovernmentalOrganisationId?: number | null;
  isDeletable?: boolean;
  isDisabledHighlight?: boolean;
  isEditable?: boolean;
  isEditorialStatusUpdatable?: boolean;
  isEvaluated?: string;
  isEvaluationResultsPubliclyAvailable?: boolean;
  isInfoHighlight?: boolean;
  isWarningHighlight?: boolean;
  joint?: string | null;
  monitoringMechanismDescription?: string | null;
  moreInfos?: string | null;
  originalName?: string | null;
  otherEngagementMechanism?: string | null;
  otherEvaluationBy?: string | null;
  otherInitiativeType?: string | null;
  overview?: string;
  principles?: InitiativePrinciple[];
  publishedByEmail?: string;
  publishedByName?: string;
  relevantFiles?: unknown[];
  relevantUrls?: string[];
  responsibleOrganisation?: string;
  responsibleOrganisationSDLocation?: string | null;
  responsibleOrganisationSI?: string;
  responsibleOrganisationSILocation?: string | null;
  slug?: string;
  sourceFiles?: unknown[];
  startYear?: number | null;
  status?: string;
  tags?: unknown[];
  targetSectors?: unknown[];
  trustworthyAIMechanismDescription?: string | null;
  trustworthyAIRelation?: string | null;
  updatedAt?: string;
  updatedByEmail?: string;
  updatedByName?: string;
  videoUrl?: string | null;
  website?: string | null;
}

export interface InitiativePaginatedResponse {
  data: Initiative[];
  totalCount: number;
}
