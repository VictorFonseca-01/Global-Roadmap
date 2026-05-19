# Security Audit (v1.0.0-enterprise-hardened)

## 1. Row Level Security (RLS)
Todas as tabelas críticas possuem RLS ativado:
- `user_profiles`: Leituras isoladas por `organization_id`.
- `roadmap_projects`: Acesso restrito a usuários da mesma organização.
- `system_telemetry`: Apenas leitura por Admins/Diretores, inserção aberta para usuários autenticados.

## 2. API Keys & Segredos
- `VITE_GEMINI_API_KEY`: Armazenada em cofre do Vercel/GitHub Secrets, nunca exposta em logs. A sanitização no `telemetry.ts` previne stacktraces com tokens.
- `VITE_SUPABASE_URL`: Apenas URL pública.

## 3. Prevenção de Abuso
- Limite de caracteres no prompt do Gemini fixado em 6000 para evitar DDOS de token.
- `geminiService.ts` gerencia concorrência máxima de 3 requisições simultâneas.
