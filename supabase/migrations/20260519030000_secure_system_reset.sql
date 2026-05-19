-- Migration: 20260519030000_secure_system_reset.sql
-- Description: Criação da função de reset seguro de dados operacionais do tenant ativo

CREATE OR REPLACE FUNCTION public.reset_operational_data()
RETURNS void AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- 1. Validar autenticação
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  -- 2. Validar se é Admin ou Super Admin
  IF NOT public.is_admin_or_super_admin() THEN
    RAISE EXCEPTION 'Não autorizado: Privilégios administrativos insuficientes.' USING ERRCODE = '42501';
  END IF;

  -- 3. Obter organization_id do usuário atual
  v_org_id := public.current_user_organization_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado: Organização do usuário não identificada.' USING ERRCODE = '42501';
  END IF;

  -- 4. Exclusão em lote por tenant (organization_id) de dados operacionais
  -- NOTA: Preservamos perfis (user_profiles), organizações (organizations),
  -- chaves do Gemini e configurações de IA (settings/system_settings) e roles.
  
  DELETE FROM public.migration_plans WHERE organization_id = v_org_id;
  DELETE FROM public.assets WHERE organization_id = v_org_id;
  DELETE FROM public.application_compatibility WHERE organization_id = v_org_id;
  DELETE FROM public.applications WHERE organization_id = v_org_id;
  DELETE FROM public.roadmap_projects WHERE organization_id = v_org_id;
  DELETE FROM public.lifecycle_catalog WHERE organization_id = v_org_id;
  DELETE FROM public.import_history WHERE organization_id = v_org_id;
  DELETE FROM public.ai_roadmap_history WHERE organization_id = v_org_id;
  DELETE FROM public.ai_usage_logs WHERE organization_id = v_org_id;
  DELETE FROM public.system_telemetry WHERE organization_id = v_org_id;
  
  -- Exclusão de jobs se houver
  DELETE FROM public.background_jobs WHERE organization_id = v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir acesso para usuários autenticados
GRANT EXECUTE ON FUNCTION public.reset_operational_data() TO authenticated;
