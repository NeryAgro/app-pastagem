# Agro Express Pasto

App instalável (PWA) para levantamento de pastagem e proposta técnica e comercial em PDF.
Funciona sem internet: os dados ficam no aparelho (IndexedDB). Próxima etapa: login e nuvem (Supabase).

- `index.html`, `css/`, `js/app.js`: o app (portado da versão offline aprovada em 17/11/2026).
- `js/store-local.js`: armazenamento no aparelho. Será trocado por um que sincroniza com a nuvem.
- `sw.js` + `manifest.webmanifest`: instalação e funcionamento offline.
- Marca Agro Express Pasto (aprovada em 18/11/2026; arquivos em marca/ do projeto).

Para testar no computador: `python3 -m http.server` nesta pasta e abrir http://localhost:8000.

## Login e nuvem (Supabase)

- `supabase/01-estrutura.sql`: tabelas `perfis` e `docs` e as regras de acesso (RLS). Cada usuário ativo lê e grava só os próprios dados; o dono (papel `admin`) lê os de todos. O primeiro usuário cadastrado vira o dono. Os demais ficam "pendente" até o dono aprovar no Painel do dono (tela Dados).
- `js/config.js`: Project URL e chave anon do Supabase. Vazio = app só no aparelho, sem login.
- `js/auth.js`: login, cadastro, senha, painel do dono e sincronização (aparelho primeiro; envia e recebe quando há internet).
- `supabase/02-produtos.sql`: catálogo único de produtos (tabela `produtos`). Todos veem os aprovados; produto novo entra "pendente"; só o dono aprova, rejeita e edita (Painel do dono).
- `supabase/03-cadastro.sql`: cadastro completo (WhatsApp, empresa, categoria Técnico/Vendedor/RC, município, estado).
- `supabase/04-propostas-pdf.sql`: pasta privada "propostas" no Storage para os PDFs gerados (cada usuário envia os seus; o dono lê todos).
- `js/painel-dados.js`: no Painel do dono, dados por usuário e cliente, planilha Excel, KMLs (.zip) e PDFs.
- Nada é apagado de verdade na nuvem: o app marca `apagado`, para o histórico servir à sugestão de doses.
