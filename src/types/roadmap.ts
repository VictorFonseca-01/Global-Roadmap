export interface Swimlane {
  id: string;
  title: string;
  color: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  swimlaneId: string;
  // X axis percentages (0 to 100)
  startPercentage: number;
  widthPercentage: number;
  color: string;
  dependsOn: string[]; // array of item IDs that this item depends on
}

export interface RoadmapData {
  year: number;
  swimlanes: Swimlane[];
  items: RoadmapItem[];
}
