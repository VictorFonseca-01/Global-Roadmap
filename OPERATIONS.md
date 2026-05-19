# Operations & Hypercare (v1.0.0-enterprise-hardened)

## 1. Monitoramento Ativo (System Health)
Durante os primeiros 15 dias de Hypercare, o administrador deve verificar o painel em **Settings > Saúde do Sistema** diariamente.
Fique atento a:
- Lentidão excessiva (Warning laranja) no Supabase ou parse da IA.
- Aumento de *React Crashes* (Alerta vermelho).

## 2. Resolução de Incidentes
- **Erro de IA (A resposta estava truncada):** O usuário tentou enviar uma arquitetura maior que o suportado. Instrua o uso de fragmentação de contexto.
- **Falha de Timeout:** Se o banco demorar mais de 10s para responder, verifique se a conexão do Supabase Pooler (pgBouncer) não esgotou conexões na Vercel.

## 3. Playwright E2E
A suíte de testes de validação roda no GitHub Actions toda vez que um PR é aberto para a `main`. Se falhar, o merge será bloqueado automaticamente. Para rodar localmente:
`npm run e2e` (Requer instalação do `npx playwright install` localmente).
