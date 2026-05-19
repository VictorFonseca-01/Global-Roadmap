-- Migration: 20260519020000_production_remediation.sql
-- Description: Remediação de Segurança de Produção, Hardening de RLS e Multi-tenancy

-- 1. Criar tabelas faltantes se não existirem
CREATE TABLE IF NOT EXISTS ai_roadmap_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT,
    prompt_preview TEXT,
    prompt_hash VARCHAR(64),
    project_name VARCHAR(255),
    items_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failure')),
    created_project_id UUID REFERENCES roadmap_projects(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ai_roadmap_history ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS system_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Garantir organização padrão "Global Parts Enterprise"
INSERT INTO public.organizations (id, name, domain, plan, status, created_at, updated_at)
VALUES (
    'd290f1ee-6c54-4b01-90e6-d701748f0851',
    'Global Parts Enterprise',
    'globalp.com.br',
    'enterprise',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Associar Super Admin e usuários órfãos à organização padrão
UPDATE public.user_profiles
SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851'
WHERE organization_id IS NULL;

-- 4. Associar registros NULL nas 11 tabelas base à organização padrão
UPDATE roadmap_projects SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851' WHERE organization_id IS NULL;
UPDATE lifecycle_catalog SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851' WHERE organization_id IS NULL;
UPDATE assets SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851' WHERE organization_id IS NULL;
UPDATE applications SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851' WHERE organization_id IS NULL;
UPDATE migration_plans SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851' WHERE organization_id IS NULL;
UPDATE import_history SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851' WHERE organization_id IS NULL;
UPDATE asset_categories SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851' WHERE organization_id IS NULL;
UPDATE application_compatibility SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851' WHERE organization_id IS NULL;
UPDATE ai_usage_logs SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851' WHERE organization_id IS NULL;
UPDATE ai_roadmap_history SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851' WHERE organization_id IS NULL;
UPDATE system_telemetry SET organization_id = 'd290f1ee-6c54-4b01-90e6-d701748f0851' WHERE organization_id IS NULL;

-- 5. Remover policies permissivas antigas e habilitar RLS nas tabelas críticas
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (policyname ILIKE '%full access%' OR policyname ILIKE '%Enable all access%' OR policyname ILIKE '%Enable read access%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Drop policies explicitamente conhecidas
DROP POLICY IF EXISTS "Authenticated full access" ON public.roadmap_projects;
DROP POLICY IF EXISTS "Authenticated full access" ON public.lifecycle_catalog;
DROP POLICY IF EXISTS "Authenticated full access" ON public.assets;
DROP POLICY IF EXISTS "Authenticated full access" ON public.applications;
DROP POLICY IF EXISTS "Authenticated full access" ON public.migration_plans;
DROP POLICY IF EXISTS "Authenticated full access" ON public.import_history;
DROP POLICY IF EXISTS "Authenticated full access" ON public.asset_categories;
DROP POLICY IF EXISTS "Authenticated full access" ON public.application_compatibility;
DROP POLICY IF EXISTS "Authenticated full access" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.migration_plans;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.assets;

-- Habilitar RLS em todas as tabelas críticas
ALTER TABLE public.roadmap_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_roadmap_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_telemetry ENABLE ROW LEVEL SECURITY;

-- 6. Criar unique constraint no cache de IA
ALTER TABLE public.lifecycle_catalog DROP CONSTRAINT IF EXISTS unique_prompt_org;
ALTER TABLE public.lifecycle_catalog ADD CONSTRAINT unique_prompt_org UNIQUE (prompt_hash, organization_id);

-- 7. Criar políticas robustas de Tenant Isolation (SELECT, INSERT, UPDATE, DELETE)

-- Função auxiliar para verificar se o usuário é administrador ou super administrador
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND LOWER(role) IN ('admin', 'super admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Definir policies por tabela para SELECT, INSERT, UPDATE e DELETE

-- 1. roadmap_projects
DROP POLICY IF EXISTS "Isolamento Tenant - SELECT roadmap_projects" ON public.roadmap_projects;
CREATE POLICY "Isolamento Tenant - SELECT roadmap_projects" ON public.roadmap_projects
FOR SELECT TO authenticated USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - INSERT roadmap_projects" ON public.roadmap_projects;
CREATE POLICY "Isolamento Tenant - INSERT roadmap_projects" ON public.roadmap_projects
FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - UPDATE roadmap_projects" ON public.roadmap_projects;
CREATE POLICY "Isolamento Tenant - UPDATE roadmap_projects" ON public.roadmap_projects
FOR UPDATE TO authenticated USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - DELETE roadmap_projects" ON public.roadmap_projects;
CREATE POLICY "Isolamento Tenant - DELETE roadmap_projects" ON public.roadmap_projects
FOR DELETE TO authenticated USING (organization_id = public.current_user_organization_id() AND public.is_admin_or_super_admin());

-- 2. lifecycle_catalog
DROP POLICY IF EXISTS "Isolamento Tenant - SELECT lifecycle_catalog" ON public.lifecycle_catalog;
CREATE POLICY "Isolamento Tenant - SELECT lifecycle_catalog" ON public.lifecycle_catalog
FOR SELECT TO authenticated USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - INSERT lifecycle_catalog" ON public.lifecycle_catalog;
CREATE POLICY "Isolamento Tenant - INSERT lifecycle_catalog" ON public.lifecycle_catalog
FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - UPDATE lifecycle_catalog" ON public.lifecycle_catalog;
CREATE POLICY "Isolamento Tenant - UPDATE lifecycle_catalog" ON public.lifecycle_catalog
FOR UPDATE TO authenticated USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - DELETE lifecycle_catalog" ON public.lifecycle_catalog;
CREATE POLICY "Isolamento Tenant - DELETE lifecycle_catalog" ON public.lifecycle_catalog
FOR DELETE TO authenticated USING (organization_id = public.current_user_organization_id() AND public.is_admin_or_super_admin());

-- 3. assets
DROP POLICY IF EXISTS "Isolamento Tenant - SELECT assets" ON public.assets;
CREATE POLICY "Isolamento Tenant - SELECT assets" ON public.assets
FOR SELECT TO authenticated USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - INSERT assets" ON public.assets;
CREATE POLICY "Isolamento Tenant - INSERT assets" ON public.assets
FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - UPDATE assets" ON public.assets;
CREATE POLICY "Isolamento Tenant - UPDATE assets" ON public.assets
FOR UPDATE TO authenticated USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - DELETE assets" ON public.assets;
CREATE POLICY "Isolamento Tenant - DELETE assets" ON public.assets
FOR DELETE TO authenticated USING (organization_id = public.current_user_organization_id() AND public.is_admin_or_super_admin());

-- 4. applications
DROP POLICY IF EXISTS "Isolamento Tenant - SELECT applications" ON public.applications;
CREATE POLICY "Isolamento Tenant - SELECT applications" ON public.applications
FOR SELECT TO authenticated USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - INSERT applications" ON public.applications;
CREATE POLICY "Isolamento Tenant - INSERT applications" ON public.applications
FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - UPDATE applications" ON public.applications;
CREATE POLICY "Isolamento Tenant - UPDATE applications" ON public.applications
FOR UPDATE TO authenticated USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - DELETE applications" ON public.applications;
CREATE POLICY "Isolamento Tenant - DELETE applications" ON public.applications
FOR DELETE TO authenticated USING (organization_id = public.current_user_organization_id() AND public.is_admin_or_super_admin());

-- 5. migration_plans
DROP POLICY IF EXISTS "Isolamento Tenant - SELECT migration_plans" ON public.migration_plans;
CREATE POLICY "Isolamento Tenant - SELECT migration_plans" ON public.migration_plans
FOR SELECT TO authenticated USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - INSERT migration_plans" ON public.migration_plans;
CREATE POLICY "Isolamento Tenant - INSERT migration_plans" ON public.migration_plans
FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - UPDATE migration_plans" ON public.migration_plans;
CREATE POLICY "Isolamento Tenant - UPDATE migration_plans" ON public.migration_plans
FOR UPDATE TO authenticated USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - DELETE migration_plans" ON public.migration_plans;
CREATE POLICY "Isolamento Tenant - DELETE migration_plans" ON public.migration_plans
FOR DELETE TO authenticated USING (organization_id = public.current_user_organization_id() AND public.is_admin_or_super_admin());

-- 6. import_history
DROP POLICY IF EXISTS "Isolamento Tenant - SELECT import_history" ON public.import_history;
CREATE POLICY "Isolamento Tenant - SELECT import_history" ON public.import_history
FOR SELECT TO authenticated USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - INSERT import_history" ON public.import_history;
CREATE POLICY "Isolamento Tenant - INSERT import_history" ON public.import_history
FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - UPDATE import_history" ON public.import_history;
CREATE POLICY "Isolamento Tenant - UPDATE import_history" ON public.import_history
FOR UPDATE TO authenticated USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - DELETE import_history" ON public.import_history;
CREATE POLICY "Isolamento Tenant - DELETE import_history" ON public.import_history
FOR DELETE TO authenticated USING (organization_id = public.current_user_organization_id() AND public.is_admin_or_super_admin());

-- 7. asset_categories
DROP POLICY IF EXISTS "Isolamento Tenant - SELECT asset_categories" ON public.asset_categories;
CREATE POLICY "Isolamento Tenant - SELECT asset_categories" ON public.asset_categories
FOR SELECT TO authenticated USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - INSERT asset_categories" ON public.asset_categories;
CREATE POLICY "Isolamento Tenant - INSERT asset_categories" ON public.asset_categories
FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - UPDATE asset_categories" ON public.asset_categories;
CREATE POLICY "Isolamento Tenant - UPDATE asset_categories" ON public.asset_categories
FOR UPDATE TO authenticated USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - DELETE asset_categories" ON public.asset_categories;
CREATE POLICY "Isolamento Tenant - DELETE asset_categories" ON public.asset_categories
FOR DELETE TO authenticated USING (organization_id = public.current_user_organization_id() AND public.is_admin_or_super_admin());

-- 8. application_compatibility
DROP POLICY IF EXISTS "Isolamento Tenant - SELECT application_compatibility" ON public.application_compatibility;
CREATE POLICY "Isolamento Tenant - SELECT application_compatibility" ON public.application_compatibility
FOR SELECT TO authenticated USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - INSERT application_compatibility" ON public.application_compatibility;
CREATE POLICY "Isolamento Tenant - INSERT application_compatibility" ON public.application_compatibility
FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - UPDATE application_compatibility" ON public.application_compatibility;
CREATE POLICY "Isolamento Tenant - UPDATE application_compatibility" ON public.application_compatibility
FOR UPDATE TO authenticated USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - DELETE application_compatibility" ON public.application_compatibility;
CREATE POLICY "Isolamento Tenant - DELETE application_compatibility" ON public.application_compatibility
FOR DELETE TO authenticated USING (organization_id = public.current_user_organization_id() AND public.is_admin_or_super_admin());

-- 9. ai_usage_logs
DROP POLICY IF EXISTS "Isolamento Tenant - SELECT ai_usage_logs" ON public.ai_usage_logs;
CREATE POLICY "Isolamento Tenant - SELECT ai_usage_logs" ON public.ai_usage_logs
FOR SELECT TO authenticated USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - INSERT ai_usage_logs" ON public.ai_usage_logs;
CREATE POLICY "Isolamento Tenant - INSERT ai_usage_logs" ON public.ai_usage_logs
FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - UPDATE ai_usage_logs" ON public.ai_usage_logs;
CREATE POLICY "Isolamento Tenant - UPDATE ai_usage_logs" ON public.ai_usage_logs
FOR UPDATE TO authenticated USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - DELETE ai_usage_logs" ON public.ai_usage_logs;
CREATE POLICY "Isolamento Tenant - DELETE ai_usage_logs" ON public.ai_usage_logs
FOR DELETE TO authenticated USING (organization_id = public.current_user_organization_id() AND public.is_admin_or_super_admin());

-- 10. ai_roadmap_history
DROP POLICY IF EXISTS "Isolamento Tenant - SELECT ai_roadmap_history" ON public.ai_roadmap_history;
CREATE POLICY "Isolamento Tenant - SELECT ai_roadmap_history" ON public.ai_roadmap_history
FOR SELECT TO authenticated USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - INSERT ai_roadmap_history" ON public.ai_roadmap_history;
CREATE POLICY "Isolamento Tenant - INSERT ai_roadmap_history" ON public.ai_roadmap_history
FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - UPDATE ai_roadmap_history" ON public.ai_roadmap_history;
CREATE POLICY "Isolamento Tenant - UPDATE ai_roadmap_history" ON public.ai_roadmap_history
FOR UPDATE TO authenticated USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - DELETE ai_roadmap_history" ON public.ai_roadmap_history;
CREATE POLICY "Isolamento Tenant - DELETE ai_roadmap_history" ON public.ai_roadmap_history
FOR DELETE TO authenticated USING (organization_id = public.current_user_organization_id() AND public.is_admin_or_super_admin());

-- 11. system_telemetry
DROP POLICY IF EXISTS "Isolamento Tenant - SELECT system_telemetry" ON public.system_telemetry;
CREATE POLICY "Isolamento Tenant - SELECT system_telemetry" ON public.system_telemetry
FOR SELECT TO authenticated USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - INSERT system_telemetry" ON public.system_telemetry;
CREATE POLICY "Isolamento Tenant - INSERT system_telemetry" ON public.system_telemetry
FOR INSERT TO authenticated WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - UPDATE system_telemetry" ON public.system_telemetry;
CREATE POLICY "Isolamento Tenant - UPDATE system_telemetry" ON public.system_telemetry
FOR UPDATE TO authenticated USING (organization_id = public.current_user_organization_id()) WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Isolamento Tenant - DELETE system_telemetry" ON public.system_telemetry;
CREATE POLICY "Isolamento Tenant - DELETE system_telemetry" ON public.system_telemetry
FOR DELETE TO authenticated USING (organization_id = public.current_user_organization_id() AND public.is_admin_or_super_admin());
