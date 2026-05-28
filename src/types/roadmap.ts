export interface Swimlane {
  id: string;
  title: string;
  color: string;
  description?: string;
  icon?: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  swimlaneId: string;
  startPercentage: number;
  widthPercentage: number;
  color: string;
  dependsOn: string[]; // array of predecessor item IDs
  progress: number; // 0 to 100
  status: 'on_track' | 'at_risk' | 'delayed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  ownerName: string;
  ownerAvatar: string;
  description?: string;
}

export interface RoadmapData {
  year: number;
  swimlanes: Swimlane[];
  items: RoadmapItem[];
}
