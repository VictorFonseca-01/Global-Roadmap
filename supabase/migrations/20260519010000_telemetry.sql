-- Migration: system_telemetry

CREATE TABLE IF NOT EXISTS system_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- 'react_crash', 'performance_warning', 'api_error'
    severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'critical'
    message TEXT NOT NULL,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para facilitar consultas no painel de System Health
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON system_telemetry(created_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_severity ON system_telemetry(severity);

-- RLS
ALTER TABLE system_telemetry ENABLE ROW LEVEL SECURITY;

-- Admins podem ler tudo (para visualização no System Health)
CREATE POLICY "Admins can view telemetry"
ON system_telemetry FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND role IN ('admin', 'director')
  )
);

-- Qualquer usuário autenticado pode inserir eventos de telemetria (gerados pela própria UI)
CREATE POLICY "Authenticated users can insert telemetry"
ON system_telemetry FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
