# Agro Express Pasto

App instalável (PWA) para levantamento de pastagem e proposta técnica e comercial em PDF.
Funciona sem internet: os dados ficam no aparelho (IndexedDB). Próxima etapa: login e nuvem (Supabase).

- `index.html`, `css/`, `js/app.js`: o app (portado da versão offline aprovada em 17/11/2026).
- `js/store-local.js`: armazenamento no aparelho. Será trocado por um que sincroniza com a nuvem.
- `sw.js` + `manifest.webmanifest`: instalação e funcionamento offline.
- Marca Agro Express Pasto (aprovada em 18/11/2026; arquivos em marca/ do projeto).

Para testar no computador: `python3 -m http.server` nesta pasta e abrir http://localhost:8000.
