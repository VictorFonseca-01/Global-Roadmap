export type Criticality = 'low' | 'medium' | 'high' | 'critical';
export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived';
export type CompatibilityStatus = 'compatible' | 'needs_testing' | 'incompatible';
export type MigrationStatus = 'planned' | 'testing' | 'pilot' | 'in_progress' | 'completed' | 'blocked';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AssetCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  description?: string;
  created_at?: string;
}

export interface RoadmapProject {
  id: string;
  name: string;
  category: string;
  scope?: string;
  status: ProjectStatus;
  description?: string;
  owner?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LifecycleItem {
  id: string;
  category_id: string;
  vendor: string;
  product_name: string;
  model?: string;
  version?: string;
  asset_type?: string;
  release_date?: string;
  end_of_support: string;
  extended_support_end?: string;
  successor_version?: string;
  is_supported: boolean;
  notes?: string;
  source_url?: string;
  confidence_score?: number;
  verification_status?: string;
  last_verified_at?: string;
  created_at?: string;
  updated_at?: string;
  // Join fields
  asset_categories?: AssetCategory;
}

export interface Application {
  id: string;
  name: string;
  vendor?: string;
  current_version?: string;
  criticality: Criticality;
  owner_department?: string;
  notes?: string;
  created_at?: string;
}

export interface ApplicationCompatibility {
  id: string;
  application_id: string;
  lifecycle_id: string;
  compatibility_status: CompatibilityStatus;
  notes?: string;
  // Join fields
  applications?: Application;
  lifecycle_catalog?: LifecycleItem;
}

export interface Asset {
  id: string;
  hostname: string;
  asset_tag?: string;
  device_type: string;
  category_id?: string;
  lifecycle_id?: string;
  application_id?: string;
  owner_department?: string;
  business_criticality: Criticality;
  cpu?: string;
  ram_gb?: number;
  storage_gb?: number;
  purchase_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Join fields
  asset_categories?: AssetCategory;
  lifecycle_catalog?: LifecycleItem;
  applications?: Application;
}

export interface MigrationPlan {
  id: string;
  roadmap_project_id: string;
  asset_id: string;
  priority: Priority;
  risk_level: RiskLevel;
  status: MigrationStatus;
  recommended_target_os?: string;
  recommended_start_date?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  estimated_cost?: number;
  justification?: string;
  created_at?: string;
  updated_at?: string;
  // Join fields
  assets?: Asset;
  roadmap_projects?: RoadmapProject;
}

export interface ImportHistory {
  id: string;
  file_name: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  imported_at?: string;
}
