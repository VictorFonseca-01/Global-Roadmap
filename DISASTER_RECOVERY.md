# Disaster Recovery Plan (v1.0.0-enterprise-hardened)

## 1. Rollback de Deploy (Frontend)
Caso o deploy na Vercel/Netlify apresente falhas catastróficas:
1. Acesse o painel do provedor de hospedagem.
2. Localize a aba "Deployments".
3. Encontre o último *deploy* bem-sucedido com a tag `v1.0.0-enterprise-hardened`.
4. Clique em "Promote to Production" ou "Rollback".

## 2. Restore de Banco de Dados (Supabase)
O Supabase realiza backups diários automáticos (Plano Pro).
1. Acesse `Database > Backups` no painel do Supabase.
2. Selecione o Point in Time Recovery (PITR) desejado.
3. Clique em "Restore".

## 3. Falha Total da IA (Gemini Offline)
Se a API do Gemini cair globalmente:
- A interface retornará o *fallback* "Problema de conexão com o servidor de IA".
- O fluxo de criação manual de roadmaps continuará operando normalmente. Não há *Single Point of Failure* bloqueando a ferramenta inteira.
