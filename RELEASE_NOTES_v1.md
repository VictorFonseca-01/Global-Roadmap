# 📑 Notas de Lançamento (Release Notes) — V1.0.0
> **Global Parts Technology Roadmap**  
> **Versão:** v1.0.0-smart-lifecycle (Release Candidate)  
> **Data:** 21 de Maio de 2026

---

## 🌟 1. Visão Geral do Lançamento
Temos o prazer de anunciar o lançamento da **V1.0.0 (Release Candidate)** da plataforma **Global Parts Technology Roadmap**. Esta versão consolida um sistema de governança de TI robusto, inteligente e focado no usuário executivo. 

O foco central desta V1 é a **simplificação extrema**: eliminar formulários extensos e pesquisas manuais de fim de vida (EoL), permitindo que um gestor de TI obtenha um planejamento de migração tecnológica completo em segundos a partir de suas exportações de inventário do GLPI.

---

## 🛠️ 2. Funcionalidades Principais da Plataforma

### 📥 Ingestão Desacoplada e Importação do GLPI (Arquitetura V1.1)
*   **Importação Sem IA (Instantânea & Local):** O fluxo de upload de planilhas foi completamente isolado da inteligência artificial. A importação ocorre 100% offline no servidor local, sem chamadas externas a APIs ou Edge Functions, tornando a ingestão imediata e resiliente a falhas de rede.
*   **Preservação Bruta de Dados (JSON estruturado):** Os dados técnicos originais de SO, Versão, Fabricante e Modelo são salvos diretamente em formato estruturado (`raw_inventory_data` no campo `notes`) sem distorções ou datas fakes. Os ativos iniciam com `lifecycle_id = null` por padrão.
*   **Late Binding de Lifecycle:** O vínculo entre os ativos físicos e o catálogo homologado de ciclo de vida (`lifecycle_id`) ocorre de forma tardia e segura tão logo o usuário valide e confirme o Roadmap gerado estrategicamente.
*   **Parser Universal:** Processa planilhas em formatos **CSV** e **XLSX** de maneira extremamente tolerante.
*   **Mapeamento Inteligente de Colunas:** Traduz automaticamente mais de 60 variações de nomes de colunas (aliases) em português e inglês (ex: `Sistema operacional` / `Operating System` / `OS`).
*   **Higiene & Normalização:** Remove espaços duplicados, limpa bordas e converte strings críticas para letras maiúsculas para eliminar duplicidades (ex: `Win 10` e `win 10` tornam-se o mesmo SO).
*   **Deduplicação Hierárquica:** Resolve conflitos com base na prioridade de IDs únicos corporativos: **1º `asset_tag` ➔ 2º `serial` ➔ 3º `hostname`**.
*   **Regra de Ouro dos Dados:** O motor de importação impede a substituição de dados preenchidos e válidos por campos em branco do novo arquivo importado.
*   **Preview de Impacto:** Tela informativa mostrando a quantidade de novos ativos, modificações e linhas ignoradas antes de salvar fisicamente no banco de dados.

### 🧠 Inteligência Artificial (Smart Lifecycle AI)
*   **Geração Sem Prompt:** A IA lê o inventário agrupado e deduz as datas oficiais de fim de suporte (EoL) e suporte estendido do fornecedor sem que o usuário precise escrever instruções de busca.
*   **Integração com Gemini API:** Comunicação estruturada de alta velocidade através de Edge Functions do Supabase.
*   **Robustez de Duplo Canal (Retry & Fallback):**
    *   **Retry Automático:** Se a requisição de IA sofrer falhas de conexão de rede, timeouts ou limites de taxa (HTTP 429), o sistema aguarda **2 segundos** e realiza uma segunda tentativa automática mantendo a interface ativa.
    *   **Fallback Local Determinístico:** Caso a IA permaneça instável, o sistema ativa imediatamente a biblioteca interna de ciclo de vida (LIFECYCLE_CATALOG) para prover datas precisas e seguras offline, garantindo que o fluxo do usuário nunca trave.
*   **Telemetria Avançada:** Registro automatizado de status e falhas na tabela `system_telemetry` com informações de `retry_count`, `fallback_reason` e `edge_function_status`.

### 📅 Timeline Gantt Drag-and-Drop
*   **Interface Interativa:** Visualização executiva baseada em `react-rnd` para arrastar e redimensionar os prazos sugeridos de migração horizontalmente.
*   **Debounce Inteligente:** As alterações na Timeline possuem um **debounce de 600ms** antes de gravar no banco de dados remoto, reduzindo em mais de 80% as transações de escrita do Supabase e otimizando a performance em redes corporativas.
*   **Esquema de Cores Semântico:** Identificação de prioridades corporativas em gradientes visuais elegantes (Crítico ➔ Rose, Alto ➔ Amber, Médio ➔ Blue, Baixo ➔ Emerald).
*   **Contextualização:** Linha vertical azul indicando o dia atual ("hoje") e estados vazios com dicas inteligentes para projetos recém-criados.

### 📄 Exportação PDF Executiva
*   **PDF Prontinho:** Geração de documento de múltiplas páginas formatado com cabeçalho corporativo, dados do projeto e sumários.
*   **Matriz de Riscos e Custos:** Exibe análises financeiras consolidadas (Capex/Opex de migração), lista de ativos afetados e simulações de impacto por atraso de migração.
*   **Feedback Visual:** Botão com spinner animado e desabilitado durante a geração para evitar cliques redundantes, integrado ao controle de promessas de toasts do frontend.

---

## 🔒 3. Segurança & Compliance
*   **RLS (Row Level Security):** Ativado em todas as tabelas do Supabase. Cada usuário só consegue visualizar e modificar dados associados ao identificador de sua organização (`organization_id`).
*   **Sanitização de Prompts:** Validação e limpeza de termos inseridos por chat para mitigar ataques de Prompt Injection.
*   **Logs de Auditoria:** Gravação centralizada de eventos cruciais de segurança, como importações efetuadas (`IMPORT`), atualizações cadastrais (`UPDATE_PROFILE`) e saídas do sistema (`LOGOUT`).

---

## ⚠️ 4. Limitações Conhecidas na Versão V1
*   **Bundle de Produção Otimizado:** O bundle gerado tem 803 kB (gzip) devido às ricas bibliotecas Gantt e PDF. O carregamento inicial pode demorar frações de segundos a mais em conexões móveis lentas.
*   **Checkbox "Lembrar Dispositivo":** O botão de login é meramente visual para manter o design moderno; o SDK do Supabase já gerencia a persistência de sessão por cookies/LocalStorage automaticamente.
*   **Virtualização:** Bases extremas com mais de 500 barras de Gantt simultâneas podem apresentar leve lag de layout em computadores legados.

---

**Equipe Global Parts Technology Roadmap**  
*Desenvolvido em parceria com Antigravity por Google DeepMind.*
