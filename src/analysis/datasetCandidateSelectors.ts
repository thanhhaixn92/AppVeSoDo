import { VisualCandidate } from '../types';
import {
  deriveDatasetFirstFromLegacyCandidate,
  DatasetCandidate,
  FigureRecommendation
} from './datasetModel';
import { isCandidateUsable } from './candidateModel';

export interface DatasetFirstGroup {
  datasetCandidate: DatasetCandidate;
  recommendations: FigureRecommendation[];
}

export interface DatasetFirstViewModel<T extends VisualCandidate> {
  groups: DatasetFirstGroup[];
  legacyCandidateByRecommendationId: Record<string, T>;
}

/**
 * Pure helper that fills missing chart/table/diagram payload fields in a group's DatasetCandidate
 * by scanning later candidates in the same group. Operates without mutating any input candidate.
 * Returns a new DatasetCandidate with merged data fields.
 */
export function mergeGroupDataPayload(
  base: DatasetCandidate,
  additionalCandidates: VisualCandidate[]
): DatasetCandidate {
  let { chart, diagram, table } = base.data;
  let extractedItems = base.extractedItems;
  let datasetSelection = { ...base.datasetSelection };

  for (const cand of additionalCandidates) {
    if (!chart && cand.data.chart) {
      chart = cand.data.chart;
    }
    if (!diagram && cand.data.diagram) {
      diagram = cand.data.diagram;
    }
    if (!table && cand.data.table) {
      table = cand.data.table;
    }
    // Merge extractedItems conservatively: prefer the first non-empty array
    if ((!extractedItems || extractedItems.length === 0) && cand.extractedItems && cand.extractedItems.length > 0) {
      extractedItems = cand.extractedItems;
    }

    // Metadata fallback
    if (!datasetSelection.sourceText && cand.sourceText) datasetSelection.sourceText = cand.sourceText;
    if (!datasetSelection.sourceExcerpt && cand.sourceExcerpt) datasetSelection.sourceExcerpt = cand.sourceExcerpt;
    if (!datasetSelection.sourceLineRange && cand.sourceLineRange) datasetSelection.sourceLineRange = cand.sourceLineRange;
    if (!datasetSelection.sourceSectionId && cand.sourceSectionId) datasetSelection.sourceSectionId = cand.sourceSectionId;
    if (!datasetSelection.sourceSectionHeading && cand.sourceSectionHeading) datasetSelection.sourceSectionHeading = cand.sourceSectionHeading;
  }

  return {
    ...base,
    datasetSelection,
    data: { chart, diagram, table },
    extractedItems,
  };
}

/**
 * Pure selector that groups legacy VisualCandidates into dataset-first groups.
 * VisualCandidates sharing the same sourceGroupId are grouped under a single DatasetCandidate.
 * Missing payload fields (chart/table/diagram) are filled from later candidates in the group.
 */
export function selectDatasetFirstGroups<T extends VisualCandidate>(candidates: T[] | null | undefined): DatasetFirstViewModel<T> {
  const groupsMap = new Map<string, DatasetFirstGroup>();
  const groupCandidatesMap = new Map<string, T[]>();
  const legacyCandidateByRecommendationId: Record<string, T> = {};

  if (!candidates) {
    return { groups: [], legacyCandidateByRecommendationId };
  }

  candidates.forEach(candidate => {
    const { datasetCandidate, recommendation } = deriveDatasetFirstFromLegacyCandidate(candidate);

    // Grouping key: use sourceGroupId if present, otherwise fallback to candidate id
    const groupId = candidate.sourceGroupId ? `dataset-group-${candidate.sourceGroupId}` : `dataset-single-${candidate.id}`;

    if (!groupsMap.has(groupId)) {
      groupsMap.set(groupId, {
        datasetCandidate: {
          ...datasetCandidate,
          id: groupId // Unified ID for the group
        },
        recommendations: []
      });
      groupCandidatesMap.set(groupId, []);
    }

    const group = groupsMap.get(groupId)!;
    const groupCandidates = groupCandidatesMap.get(groupId)!;
    groupCandidates.push(candidate);

    // Link recommendation to the unified dataset candidate
    const linkedRecommendation: FigureRecommendation = {
      ...recommendation,
      datasetCandidateId: groupId
    };

    group.recommendations.push(linkedRecommendation);
    legacyCandidateByRecommendationId[linkedRecommendation.id] = candidate;
  });

  // Merge missing payload fields across candidates within each group
  const groups = Array.from(groupsMap.entries()).map(([groupId, group]) => {
    const groupCandidates = groupCandidatesMap.get(groupId) ?? [];
    if (groupCandidates.length > 1) {
      const mergedDatasetCandidate = mergeGroupDataPayload(group.datasetCandidate, groupCandidates.slice(1));
      return { ...group, datasetCandidate: mergedDatasetCandidate };
    }
    return group;
  });

  return {
    groups,
    legacyCandidateByRecommendationId
  };
}

export function splitAndSortRecommendations<T extends VisualCandidate>(
  recommendations: FigureRecommendation[],
  legacyCandidateByRecommendationId: Record<string, T>
): { usableRecs: FigureRecommendation[]; invalidRecs: FigureRecommendation[] } {
  const usableRecs: FigureRecommendation[] = [];
  const invalidRecs: FigureRecommendation[] = [];

  recommendations.forEach(rec => {
    const legacyCand = legacyCandidateByRecommendationId[rec.id];
    if (legacyCand) {
      if (isCandidateUsable(legacyCand)) {
        usableRecs.push(rec);
      } else {
        invalidRecs.push(rec);
      }
    }
  });

  return { usableRecs, invalidRecs };
}
