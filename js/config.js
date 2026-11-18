/* Ligação com o Supabase (login e nuvem).
   Estas duas informações são públicas (a segurança vem das regras do banco).
   Sem elas o app funciona só no aparelho, sem login. */
window.APP_CONFIG = {
  supabaseUrl: "",
  supabaseKey: ""
};
