export type Criticality = 'low' | 'medium' | 'high' | 'critical';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'retrying';
export type JobType = 'import_assets' | 'generate_roadmap' | 'enrich_lifecycle' | 'generate_pdf' | 'send_email_report' | 'eol_check';
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
  // Campos calculados
  total_assets?: number;
  total_migration_plans?: number;
  critical_count?: number;
  estimated_budget?: number;
  last_generated_at?: string;
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
  expires_at?: string;
  prompt_hash?: string;
  model_name?: string;
  raw_response?: any;
  created_at?: string;
  updated_at?: string;
  // Join fields
  asset_categories?: AssetCategory;
}

export type NotificationType = 
  | 'lifecycle_warning' 
  | 'critical_asset' 
  | 'roadmap_delay' 
  | 'ai_review_required' 
  | 'import_completed' 
  | 'system_error';

export type NotificationPriority = 'critical' | 'warning' | 'info' | 'success';

export interface Notification {
  id: string;
  user_id?: string;
  type: NotificationType;
  priority: NotificationPriority;
  severity?: string;
  title: string;
  description: string;
  is_read: boolean;
  context_url?: string;
  metadata?: any;
  read_at?: string;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  company_name: string;
  primary_domain?: string;
  default_theme: string;
  lifecycle_notifications: boolean;
  monthly_reports: boolean;
  ai_enabled: boolean;
  ai_auto_enrichment: boolean;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  metadata?: any;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  avatar_url?: string;
  preferred_theme: 'light' | 'dark' | 'system';
  last_login?: string;
  updated_at?: string;
  created_at?: string;
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

export interface BackgroundJob {
  id: string;
  organization_id: string;
  type: JobType;
  status: JobStatus;
  payload: any;
  result?: any;
  error?: any;
  attempts: number;
  max_attempts: number;
  created_by?: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}
