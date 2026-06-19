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
 * Pure selector that groups legacy VisualCandidates into dataset-first groups.
 * VisualCandidates sharing the same sourceGroupId are grouped under a single DatasetCandidate.
 */
export function selectDatasetFirstGroups<T extends VisualCandidate>(candidates: T[] | null | undefined): DatasetFirstViewModel<T> {
  const groupsMap = new Map<string, DatasetFirstGroup>();
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
    }

    const group = groupsMap.get(groupId)!;
    
    // Link recommendation to the unified dataset candidate
    const linkedRecommendation: FigureRecommendation = {
      ...recommendation,
      datasetCandidateId: groupId
    };

    group.recommendations.push(linkedRecommendation);
    legacyCandidateByRecommendationId[linkedRecommendation.id] = candidate;
  });

  return {
    groups: Array.from(groupsMap.values()),
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
