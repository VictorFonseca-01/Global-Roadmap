-- Tabela de Perfis de Usuário
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  department TEXT,
  avatar_url TEXT,
  preferred_theme TEXT DEFAULT 'system',
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Usuários podem ver seu próprio perfil" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir seu próprio perfil" 
  ON user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Nota: Como estamos em um ambiente de demonstração, 
-- vou inserir um perfil inicial para o ID de teste se ele não existir.
INSERT INTO user_profiles (id, full_name, email, role, department, avatar_url)
SELECT 
  '00000000-0000-0000-0000-000000000000', -- ID Mock para dev
  'Victor Fonseca',
  'victor.fonseca@globalparts.com',
  'IT Director',
  'Infrastructure & Security',
  'https://github.com/shadcn.png'
ON CONFLICT (id) DO NOTHING;
