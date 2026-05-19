-- Tabela background_jobs
CREATE TABLE IF NOT EXISTS background_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    payload JSONB DEFAULT '{}'::jsonb,
    result JSONB,
    error JSONB,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_type ON background_jobs(type);
CREATE INDEX IF NOT EXISTS idx_background_jobs_created_at ON background_jobs(created_at);

-- RLS
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuários podem ler seus jobs"
  ON background_jobs FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Usuários podem criar jobs"
  ON background_jobs FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Usuários podem atualizar seus jobs"
  ON background_jobs FOR UPDATE
  USING (auth.uid() = created_by);
