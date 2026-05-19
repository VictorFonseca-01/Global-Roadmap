-- Migration: ai_roadmap_history

CREATE TABLE IF NOT EXISTS ai_roadmap_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    project_name VARCHAR(255),
    items_count INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failure')),
    created_project_id UUID REFERENCES roadmap_projects(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE ai_roadmap_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI history"
ON ai_roadmap_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all AI history"
ON ai_roadmap_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND role IN ('admin', 'director', 'manager')
  )
);

CREATE POLICY "Users can insert their own AI history"
ON ai_roadmap_history FOR INSERT
WITH CHECK (auth.uid() = user_id);
