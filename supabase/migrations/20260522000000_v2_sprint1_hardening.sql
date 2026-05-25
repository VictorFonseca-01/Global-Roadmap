-- Add revision_version to core tables
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS revision_version integer not null default 1;
ALTER TABLE public.roadmap_projects ADD COLUMN IF NOT EXISTS revision_version integer not null default 1;
ALTER TABLE public.migration_plans ADD COLUMN IF NOT EXISTS revision_version integer not null default 1;
ALTER TABLE public.lifecycle_catalog ADD COLUMN IF NOT EXISTS revision_version integer not null default 1;

-- Create timeline_change_log table
CREATE TABLE IF NOT EXISTS public.timeline_change_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    before_state jsonb,
    after_state jsonb,
    changed_by uuid REFERENCES auth.users(id),
    correlation_id text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timeline_change_log ENABLE ROW LEVEL SECURITY;

-- Policies for timeline_change_log
CREATE POLICY "Users can view logs from their own organization" 
ON public.timeline_change_log 
FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM public.user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert logs for their own organization" 
ON public.timeline_change_log 
FOR INSERT 
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.user_profiles 
        WHERE id = auth.uid()
    )
);

-- Deletion is restricted to avoid tampering, optionally only allowed by service roles.
-- No DELETE or UPDATE policies defined -> implicitly denied for all authenticated users.
