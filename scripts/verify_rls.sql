-- ============================================================================
-- SCRIPT DE AUDITORIA DE SEGURANÇA E POLÍTICAS RLS (ROW LEVEL SECURITY)
-- PROJETO: Global Parts Technology Roadmap
-- DATA: 2026-05-19
-- OBJETIVO: Verificar se todas as tabelas operacionais possuem RLS ativado e
--           validar o isolamento robusto entre diferentes organizações (tenants).
-- ============================================================================

-- 1. Listar todas as tabelas e verificar se RLS está habilitado (rowsecurity)
WITH rls_status AS (
  SELECT 
    schemaname,
    tablename,
    rowsecurity AS is_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
)
SELECT 
  tablename AS "Tabela",
  is_rls_enabled AS "RLS Ativo",
  CASE 
    WHEN is_rls_enabled THEN '✅ SEGURO'
    ELSE '❌ FALHA DE SEGURANÇA: RLS DESATIVADO!'
  END AS "Status RLS"
FROM rls_status
ORDER BY tablename;

-- 2. Detalhar as políticas ativas por tabela, as operações permitidas e as roles associadas
SELECT 
  schemaname AS "Schema",
  tablename AS "Tabela",
  policyname AS "Nome da Política",
  permissive AS "Permissiva",
  roles AS "Funções (Roles)",
  cmd AS "Operação",
  qual AS "Cláusula USING (Verificação)",
  with_check AS "Cláusula WITH CHECK"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 3. Consulta de Auditoria Preventiva: Tabelas críticas sem RLS ativado
SELECT 
  schemaname AS "Schema",
  tablename AS "Tabela"
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns') -- ignora tabelas internas de GIS se houver
ORDER BY tablename;

-- 4. Teste de Consistência RLS: Simulação de isolamento por Tenant
-- Executar esta consulta com diferentes roles de usuário para validar que um tenant
-- não consegue, sob hipótese alguma, obter registros de outro organization_id.
/*
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub TO '00000000-0000-0000-0000-000000000000'; -- ID de teste do Usuário
  
  -- Este select deve trazer somente itens do tenant associado à claims JWT ativa:
  SELECT * FROM public.roadmap_projects;
*/
