/* Login, cadastro, aprovação de usuários e sincronização com a nuvem (Supabase). */
(function () {
  const CFG = window.APP_CONFIG || {};
  let liberar; window.__authPronto = new Promise(r => { liberar = r; });
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const PAPEIS = { tecnico: "Técnico", vendedor: "Vendedor", admin: "Dono" };
  const STATUS = { pendente: "Aguardando aprovação", ativo: "Ativo", bloqueado: "Bloqueado" };

  // Sem Supabase configurado: modo só no aparelho, como antes.
  if (!CFG.supabaseUrl || !CFG.supabaseKey || !window.supabase) {
    window.instalarStore(window.criarStore("proposta-pasto-limpo"));
    liberar();
    return;
  }

  window.__nuvem = true;
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "aep-auth" }
  });
  window.__sb = sb;
  const voltarPara = location.origin + location.pathname;
  const recuperando = /type=recovery/.test(location.hash);
  let usuario = null, perfil = null, sync = null, iniciado = false;

  /* ---------- tela cheia de login ---------- */
  const tela = document.createElement("div");
  tela.className = "auth"; tela.id = "auth";
  document.body.appendChild(tela);
  const mostrar = html => {
    tela.hidden = false;
    tela.innerHTML = `<div class="auth-in"><img class="auth-logo" src="img/logo.png" alt="Agro Express Pasto">${html}</div>`;
  };
  const esconder = () => { tela.hidden = true; tela.innerHTML = ""; };
  const msg = (t, erro) => { const el = tela.querySelector(".auth-msg"); if (el) { el.textContent = t || ""; el.classList.toggle("err", !!erro); } };
  const ocupado = (sim) => tela.querySelectorAll("button").forEach(b => b.disabled = sim);

  function traduz(e) {
    const m = String((e && e.message) || e || "");
    if (/Invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
    if (/Email not confirmed/i.test(m)) return "Confirme o seu e-mail pelo link que enviamos antes de entrar.";
    if (/User already registered/i.test(m)) return "Este e-mail já tem cadastro. Use \"Entrar\" ou \"Esqueci a senha\".";
    if (/Password should be at least/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
    if (/rate limit|too many/i.test(m)) return "Muitas tentativas. Espere alguns minutos e tente de novo.";
    if (/Failed to fetch|NetworkError|network/i.test(m)) return "Sem internet. Conecte e tente de novo.";
    if (/valid email|invalid.*email/i.test(m)) return "Confira o e-mail digitado.";
    return m || "Algo deu errado. Tente de novo.";
  }

  function telaEntrar(aviso) {
    mostrar(`<h1>Entrar</h1>
      <p class="note">Use o e-mail e a senha do seu cadastro.</p>
      <form class="auth-form" data-form="entrar">
        <label class="f">E-mail<input type="email" name="email" autocomplete="email" required></label>
        <label class="f">Senha<input type="password" name="senha" autocomplete="current-password" required></label>
        <p class="auth-msg"></p>
        <button class="primary" type="submit">Entrar</button>
      </form>
      <div class="auth-links"><button class="ghost" data-auth="cadastro">Criar conta</button><button class="ghost" data-auth="esqueci">Esqueci a senha</button></div>`);
    if (aviso) msg(aviso);
  }
  function telaCadastro() {
    mostrar(`<h1>Criar conta</h1>
      <p class="note">Depois do cadastro, o seu acesso fica aguardando a aprovação do administrador.</p>
      <form class="auth-form" data-form="cadastro">
        <label class="f">Nome completo<input name="nome" autocomplete="name" required></label>
        <label class="f">Telefone<input name="telefone" inputmode="tel" autocomplete="tel"></label>
        <label class="f">Função<select name="papel"><option value="tecnico">Técnico</option><option value="vendedor">Vendedor</option></select></label>
        <label class="f">E-mail<input type="email" name="email" autocomplete="email" required></label>
        <label class="f">Senha (mínimo 6 caracteres)<input type="password" name="senha" autocomplete="new-password" minlength="6" required></label>
        <p class="auth-msg"></p>
        <button class="primary" type="submit">Criar conta</button>
      </form>
      <div class="auth-links"><button class="ghost" data-auth="entrar">Já tenho conta</button></div>`);
  }
  function telaEsqueci() {
    mostrar(`<h1>Esqueci a senha</h1>
      <p class="note">Enviamos um link para você criar uma senha nova.</p>
      <form class="auth-form" data-form="esqueci">
        <label class="f">E-mail<input type="email" name="email" autocomplete="email" required></label>
        <p class="auth-msg"></p>
        <button class="primary" type="submit">Enviar link</button>
      </form>
      <div class="auth-links"><button class="ghost" data-auth="entrar">Voltar</button></div>`);
  }
  function telaNovaSenha() {
    mostrar(`<h1>Nova senha</h1>
      <form class="auth-form" data-form="novasenha">
        <label class="f">Nova senha (mínimo 6 caracteres)<input type="password" name="senha" autocomplete="new-password" minlength="6" required></label>
        <p class="auth-msg"></p>
        <button class="primary" type="submit">Salvar senha</button>
      </form>`);
  }
  function telaPendente() {
    mostrar(`<h1>Cadastro recebido</h1>
      <p>Olá, ${esc(perfil && perfil.nome || "")}. O seu acesso está aguardando a aprovação do administrador.</p>
      <p class="note">Assim que for aprovado, toque em "Verificar de novo".</p>
      <p class="auth-msg"></p>
      <div class="auth-links"><button class="primary" data-auth="verificar">Verificar de novo</button><button class="ghost" data-auth="sair">Sair</button></div>`);
  }
  function telaBloqueado() {
    mostrar(`<h1>Acesso bloqueado</h1>
      <p class="note">O seu acesso foi bloqueado. Fale com o administrador do app.</p>
      <div class="auth-links"><button class="ghost" data-auth="sair">Sair</button></div>`);
  }
  function telaSemInternet() {
    mostrar(`<h1>Sem internet</h1>
      <p class="note">O primeiro acesso neste aparelho precisa de internet. Depois disso o app funciona offline.</p>
      <div class="auth-links"><button class="primary" data-auth="verificar">Tentar de novo</button></div>`);
  }

  tela.addEventListener("click", async e => {
    const b = e.target.closest("[data-auth]"); if (!b) return;
    e.preventDefault();
    const a = b.dataset.auth;
    if (a === "cadastro") telaCadastro();
    else if (a === "entrar") telaEntrar();
    else if (a === "esqueci") telaEsqueci();
    else if (a === "sair") await sair();
    else if (a === "verificar") { ocupado(true); await inicio(); }
  });
  tela.addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, tipo = f.dataset.form, v = Object.fromEntries(new FormData(f).entries());
    ocupado(true); msg("Aguarde…");
    try {
      if (tipo === "entrar") {
        const { data, error } = await sb.auth.signInWithPassword({ email: v.email.trim(), password: v.senha });
        if (error) throw error;
        await entrar(data.user);
      } else if (tipo === "cadastro") {
        const { data, error } = await sb.auth.signUp({
          email: v.email.trim(), password: v.senha,
          options: { data: { nome: v.nome.trim(), telefone: (v.telefone || "").trim(), papel: v.papel }, emailRedirectTo: voltarPara }
        });
        if (error) throw error;
        if (data.session) await entrar(data.user);
        else telaEntrar("Cadastro feito. Enviamos um link para o seu e-mail: abra o link para confirmar e depois entre aqui.");
      } else if (tipo === "esqueci") {
        const { error } = await sb.auth.resetPasswordForEmail(v.email.trim(), { redirectTo: voltarPara });
        if (error) throw error;
        msg("Pronto. Confira o seu e-mail e abra o link."); ocupado(false);
      } else if (tipo === "novasenha") {
        const { data, error } = await sb.auth.updateUser({ password: v.senha });
        if (error) throw error;
        await entrar(data.user);
      }
    } catch (err) { msg(traduz(err), true); ocupado(false); }
  });

  /* ---------- perfil ---------- */
  async function carregarPerfil(u) {
    const chave = "aep-perfil-" + u.id;
    try {
      const { data, error } = await sb.from("perfis").select("*").eq("id", u.id).maybeSingle();
      if (error) throw error;
      if (data) { try { localStorage.setItem(chave, JSON.stringify(data)); } catch (e) {} return data; }
      return null;
    } catch (e) {
      try { const c = JSON.parse(localStorage.getItem(chave) || "null"); if (c) return c; } catch (x) {}
      throw e;
    }
  }

  async function entrar(u) {
    usuario = u;
    try { perfil = await carregarPerfil(u); }
    catch (e) {
      if (!navigator.onLine) return telaSemInternet();
      return mostrar(`<h1>Não foi possível abrir</h1><p class="note">${esc(traduz(e))}</p><p class="note">Se o problema continuar, fale com o administrador do app.</p>
        <div class="auth-links"><button class="primary" data-auth="verificar">Tentar de novo</button><button class="ghost" data-auth="sair">Sair</button></div>`);
    }
    if (!perfil) { perfil = { nome: (u.user_metadata || {}).nome, status: "pendente" }; return telaPendente(); }
    if (perfil.status === "pendente") return telaPendente();
    if (perfil.status === "bloqueado") return telaBloqueado();
    await iniciarApp();
  }

  async function iniciarApp() {
    if (iniciado) { esconder(); return; }
    iniciado = true;
    mostrar(`<p class="note">Carregando os seus dados…</p>`);
    sync = criarSync(usuario.id);
    const store = window.criarStore("aep-" + usuario.id, (col, id) => sync.marcar(col, id));
    sync.ligar(store.db);
    window.instalarStore(store);
    await store.db._ready;
    // Primeira sincronização antes de abrir (no máximo 8 s; sem internet abre na hora).
    await Promise.race([sync.rodar(), new Promise(r => setTimeout(r, 8000))]);
    esconder();
    liberar();
    setInterval(() => sync.rodar(), 60000);
    window.addEventListener("online", () => sync.rodar());
    document.addEventListener("visibilitychange", () => { if (!document.hidden) sync.rodar(); });
  }

  async function sair() {
    if (sync && sync.pendentes() > 0) {
      await sync.rodar();
      if (sync.pendentes() > 0 && !confirm("Há alterações que ainda não foram para a nuvem (sem internet). Se sair agora, elas ficam só neste aparelho até você entrar de novo. Sair mesmo assim?")) return;
    }
    await sb.auth.signOut().catch(() => {});
    location.reload();
  }

  /* ---------- sincronização ---------- */
  function criarSync(uid) {
    const kP = "aep-pend-" + uid, kC = "aep-cursor-" + uid;
    let pend = {}; try { pend = JSON.parse(localStorage.getItem(kP) || "{}"); } catch (e) {}
    let db = null, rodando = null, timer = null, ultimo = null, erro = "";
    const salvarPend = () => { try { localStorage.setItem(kP, JSON.stringify(pend)); } catch (e) {} };
    const status = () => {
      const n = Object.keys(pend).length;
      if (!navigator.onLine) return n ? `Sem internet · ${n} alteração(ões) aguardando envio` : "Sem internet · tudo salvo no aparelho";
      if (erro) return "Erro ao sincronizar: " + erro;
      if (n) return `Enviando ${n} alteração(ões)…`;
      return ultimo ? "Sincronizado às " + ultimo.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Sincronizando…";
    };
    const mostrarStatus = () => { const el = document.getElementById("contaSync"); if (el) el.textContent = status(); };
    async function enviar() {
      const chaves = Object.keys(pend);
      for (let i = 0; i < chaves.length; i += 25) {
        const lote = chaves.slice(i, i + 25), marcas = lote.map(k => pend[k]);
        const linhas = [];
        for (const k of lote) {
          const j = k.lastIndexOf("/"), col = k.slice(0, j), id = k.slice(j + 1);
          const d = await db._ler(col, id);
          linhas.push({ user_id: uid, col, id, data: d, apagado: !d });
        }
        const { error } = await sb.from("docs").upsert(linhas, { onConflict: "user_id,col,id" });
        if (error) throw error;
        lote.forEach((k, n) => { if (pend[k] === marcas[n]) delete pend[k]; });
        salvarPend();
      }
    }
    async function receber() {
      let cursor = localStorage.getItem(kC) || "1970-01-01T00:00:00Z";
      for (;;) {
        const { data, error } = await sb.from("docs").select("col,id,data,apagado,atualizado_em")
          .eq("user_id", uid).gt("atualizado_em", cursor).order("atualizado_em", { ascending: true }).limit(500);
        if (error) throw error;
        for (const r of data) {
          const k = r.col + "/" + r.id;
          if (!pend[k]) {
            const atual = await db._ler(r.col, r.id);
            const novo = r.apagado ? null : r.data;
            if (JSON.stringify(atual) !== JSON.stringify(novo)) await db._aplicarRemoto(r.col, r.id, novo);
          }
          cursor = r.atualizado_em;
        }
        try { localStorage.setItem(kC, cursor); } catch (e) {}
        if (data.length < 500) break;
      }
    }
    return {
      ligar(d) { db = d; },
      pendentes: () => Object.keys(pend).length,
      status,
      marcar(col, id) { pend[col + "/" + id] = Date.now() + Math.random(); salvarPend(); mostrarStatus(); clearTimeout(timer); timer = setTimeout(() => this.rodar(), 1500); },
      rodar() {
        if (rodando) return rodando;
        rodando = (async () => {
          if (!navigator.onLine || !db) { mostrarStatus(); return; }
          try { await enviar(); await receber(); erro = ""; ultimo = new Date(); }
          catch (e) { erro = traduz(e); console.warn("sync", e); }
          mostrarStatus();
        })().finally(() => { rodando = null; });
        return rodando;
      }
    };
  }

  /* ---------- seção "Sua conta" na tela Dados ---------- */
  window.__contaHTML = () => {
    if (!perfil) return "";
    return `<section class="card section">
      <h2>Sua conta</h2>
      <p><b>${esc(perfil.nome || "")}</b> · ${esc(PAPEIS[perfil.papel] || "")}<br><span class="note">${esc(perfil.email || (usuario && usuario.email) || "")}</span></p>
      <p class="note" id="contaSync">${esc(sync ? sync.status() : "")}</p>
      <div class="row">
        <button data-conta="sync">Sincronizar agora</button>
        ${perfil.papel === "admin" ? `<button class="primary" data-conta="painel">Painel do dono</button>` : ""}
        <button class="ghost" data-conta="sair">Sair</button>
      </div>
    </section>`;
  };
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-conta]"); if (!b) return;
    const a = b.dataset.conta;
    if (a === "sync") { b.disabled = true; await sync.rodar(); b.disabled = false; }
    else if (a === "sair") await sair();
    else if (a === "painel") abrirPainel();
  });

  /* ---------- painel do dono ---------- */
  const painel = document.createElement("div");
  painel.className = "auth painel"; painel.hidden = true;
  document.body.appendChild(painel);
  async function abrirPainel() {
    painel.hidden = false;
    painel.innerHTML = `<div class="auth-in wide"><div class="row spread"><h1>Painel do dono</h1><button class="ghost" data-painel="fechar">Fechar</button></div><p class="note">Carregando…</p></div>`;
    try {
      const { data: perfis, error } = await sb.from("perfis").select("*").order("criado_em", { ascending: true });
      if (error) throw error;
      const cont = {};
      for (let de = 0; ; de += 1000) {
        const { data, error: e2 } = await sb.from("docs").select("user_id,col").eq("apagado", false).range(de, de + 999);
        if (e2) throw e2;
        data.forEach(r => { const c = cont[r.user_id] = cont[r.user_id] || {}; c[r.col] = (c[r.col] || 0) + 1; });
        if (data.length < 1000) break;
      }
      const pend = perfis.filter(p => p.status === "pendente").length;
      painel.innerHTML = `<div class="auth-in wide">
        <div class="row spread"><h1>Painel do dono</h1><button class="ghost" data-painel="fechar">Fechar</button></div>
        <p class="note">${perfis.length} usuário(s)${pend ? ` · <b>${pend} aguardando aprovação</b>` : ""}. Cada usuário vê só os próprios dados. Você vê os de todos.</p>
        <div class="row"><button data-painel="exportar">Exportar dados de todos (JSON)</button></div>
        <p class="auth-msg"></p>
        ${perfis.map(p => { const c = cont[p.id] || {}; const eu = usuario && p.id === usuario.id; return `<div class="card section user-row">
          <div class="row spread"><div><b>${esc(p.nome || "(sem nome)")}</b>${eu ? " (você)" : ""}<br><span class="note">${esc(p.email || "")}${p.telefone ? " · " + esc(p.telefone) : ""}</span></div>
          <span class="pill st-${esc(p.status)}">${esc(STATUS[p.status] || p.status)}</span></div>
          <p class="note">${esc(PAPEIS[p.papel] || p.papel)} · desde ${new Date(p.criado_em).toLocaleDateString("pt-BR")} · ${c.clientes || 0} cliente(s), ${c.pastos || 0} pasto(s), ${c.areas || 0} área(s)</p>
          ${eu ? "" : `<div class="row">
            ${p.status !== "ativo" ? `<button class="primary" data-painel="status" data-id="${p.id}" data-v="ativo" data-p="${esc(p.papel)}">${p.status === "pendente" ? "Aprovar" : "Reativar"}</button>` : ""}
            ${p.status !== "bloqueado" ? `<button class="ghost" data-painel="status" data-id="${p.id}" data-v="bloqueado" data-p="${esc(p.papel)}">Bloquear</button>` : ""}
            <select data-painel-papel="${p.id}" data-s="${esc(p.status)}">${["tecnico", "vendedor"].map(x => `<option value="${x}" ${p.papel === x ? "selected" : ""}>${PAPEIS[x]}</option>`).join("")}</select>
          </div>`}
        </div>`; }).join("")}
      </div>`;
    } catch (e) {
      painel.innerHTML = `<div class="auth-in wide"><div class="row spread"><h1>Painel do dono</h1><button class="ghost" data-painel="fechar">Fechar</button></div><p class="auth-msg err">${esc(traduz(e))}</p></div>`;
    }
  }
  async function definir(id, status, papel) {
    const { error } = await sb.rpc("admin_definir_usuario", { alvo: id, novo_status: status, novo_papel: papel });
    if (error) { const m = painel.querySelector(".auth-msg"); if (m) { m.textContent = traduz(error); m.classList.add("err"); } return; }
    abrirPainel();
  }
  painel.addEventListener("click", async e => {
    const b = e.target.closest("[data-painel]"); if (!b) return;
    const a = b.dataset.painel;
    if (a === "fechar") { painel.hidden = true; painel.innerHTML = ""; }
    else if (a === "status") { b.disabled = true; await definir(b.dataset.id, b.dataset.v, b.dataset.p); }
    else if (a === "exportar") {
      b.disabled = true; b.textContent = "Exportando…";
      try {
        const { data: perfis } = await sb.from("perfis").select("id,nome,email,papel,status");
        const linhas = [];
        for (let de = 0; ; de += 500) {
          const { data, error } = await sb.from("docs").select("user_id,col,id,data,atualizado_em").eq("apagado", false).order("atualizado_em").range(de, de + 499);
          if (error) throw error;
          linhas.push(...data);
          if (data.length < 500) break;
        }
        const usuarios = {};
        for (const p of perfis || []) usuarios[p.id] = { perfil: p, dados: {} };
        for (const r of linhas) { const u = usuarios[r.user_id] = usuarios[r.user_id] || { perfil: { id: r.user_id }, dados: {} }; (u.dados[r.col] = u.dados[r.col] || {})[r.id] = r.data; }
        const blob = new Blob([JSON.stringify({ app: "agro-express-pasto", exportadoEm: new Date().toISOString(), usuarios }, null, 1)], { type: "application/json" });
        const url = URL.createObjectURL(blob), lk = document.createElement("a");
        lk.href = url; lk.download = `agro-express-pasto-todos-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(lk); lk.click(); lk.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        b.textContent = "Exportado";
      } catch (err) { b.textContent = "Exportar dados de todos (JSON)"; b.disabled = false; const m = painel.querySelector(".auth-msg"); if (m) { m.textContent = traduz(err); m.classList.add("err"); } }
    }
  });
  painel.addEventListener("change", e => {
    const s = e.target.closest("[data-painel-papel]"); if (!s) return;
    definir(s.dataset.painelPapel, s.dataset.s, s.value);
  });

  /* ---------- início ---------- */
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === "PASSWORD_RECOVERY") telaNovaSenha();
  });
  async function inicio() {
    let session = null;
    try { ({ data: { session } } = await sb.auth.getSession()); } catch (e) {}
    if (recuperando) return; // a tela de nova senha vem pelo evento PASSWORD_RECOVERY
    if (!session) {
      // Sem internet o token não renova, mas a sessão guardada continua valendo para usar o app no campo.
      let guardada = null; try { guardada = JSON.parse(localStorage.getItem("aep-auth") || "null"); } catch (e) {}
      if (guardada && guardada.user && !navigator.onLine) return entrar(guardada.user);
      if (!navigator.onLine) return telaSemInternet();
      return telaEntrar();
    }
    await entrar(session.user);
  }
  mostrar(`<p class="note">Carregando…</p>`);
  inicio();
})();
