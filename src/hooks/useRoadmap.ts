import { useContext } from 'react';
import { RoadmapContext } from '../contexts/RoadmapContext';

export function useRoadmap() {
  const context = useContext(RoadmapContext);
  if (!context) throw new Error('useRoadmap must be used within RoadmapProvider');
  return context;
}
