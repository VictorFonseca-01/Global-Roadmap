# QA Findings - Session 1

**Bugs:**
1. [Low] Avatar Initials: "GP" em vez de "ST" para suporteti.
2. [Critical] Profile RLS Infinite Recursion: Erro 500 ao acessar/editar perfil.
3. [Medium] Lifecycle Modal: Modal não fecha após sucesso, gera 409 Conflict se clicar novamente.
4. [Medium] Assets Creation: Não há botão para criar ativo manualmente, apenas via CSV.
5. [Medium] Roadmap Timeline: Select mostra itens duplicados ("Migração Windows 11 2026").
6. [Medium] Notifications Engine: Não gera alertas para ativos expirados que já estão no banco de dados.

**Massa Criada (Lifecycle):**
- SQL Server 2019
- vSphere 7.0
- Java SE 8
(Ativos manuais falharam pela falta de botão na UI, subagent identificou apenas o import modal).
