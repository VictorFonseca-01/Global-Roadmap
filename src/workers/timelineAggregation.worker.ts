import { timelineAggregationService } from '../services/timelineAggregationService';
import { dependencyAnalysisService } from '../services/dependencyAnalysisService';

self.onmessage = (e: MessageEvent) => {
  try {
    const { type, plans } = e.data;

    if (type === 'CONSOLIDATE_AND_ANALYZE') {
      const consolidatedGroups = timelineAggregationService.consolidate(plans);
      const dependencies = dependencyAnalysisService.analyzeDependencies(consolidatedGroups);
      
      self.postMessage({
        status: 'success',
        consolidatedGroups,
        dependencies
      });
    }
  } catch (error: any) {
    self.postMessage({
      status: 'error',
      message: error.message || 'Unknown error in worker'
    });
  }
};
