/* Catálogo de produtos: listas de escolha e formulário (usado na tela Produtos e no Painel do dono). */
(function () {
  const L = window.PRODUTO_LISTAS = {
    industrias: ["Corteva Agriscience", "Bayer", "Syngenta", "BASF", "FMC", "UPL", "Nufarm", "Adama", "Albaugh",
      "Sumitomo Chemical", "Ourofino Agrociência", "Nortox", "Rotam", "Helm", "CCAB Agro", "Sipcam Nichino",
      "Prentiss", "Tecnomyl", "Outra"],
    formulacoes: [
      ["SL", "Concentrado solúvel"], ["EC", "Concentrado emulsionável"], ["SC", "Suspensão concentrada"],
      ["WG", "Granulado dispersível em água"], ["WP", "Pó molhável"], ["SG", "Granulado solúvel"], ["SP", "Pó solúvel"],
      ["ME", "Microemulsão"], ["EW", "Emulsão óleo em água"], ["OD", "Dispersão em óleo"], ["SE", "Suspo-emulsão"],
      ["CS", "Suspensão de encapsulado"], ["DC", "Concentrado dispersível"], ["ZC", "Mistura CS + SC"],
      ["GR", "Granulado"], ["AL", "Outros líquidos"], ["Outra", "Outra"]
    ],
    tipos: ["Herbicida", "Inseticida", "Fungicida", "Acaricida", "Adjuvante", "Fertilizante foliar", "Outro"],
    volumes: [["L", "Litro (L)"], ["kg", "Quilo (kg)"]],
    principios: ["2,4-D", "Aminociclopiraclor", "Aminopiralide", "Clopiralide", "Dicamba", "Diurom", "Florpirauxifen-benzil",
      "Fluroxipir-meptílico", "Glifosato", "Halauxifeno-metílico", "Hexazinona", "Imazapir", "Metsulfurom-metílico",
      "Picloram", "Tebutiurom", "Triclopir-butotílico", "Óleo mineral"]
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const opt = (v, t, sel) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(t)}</option>`;
  // Unidade da dose por hectare a partir de como o produto é vendido.
  window.unidadeDose = (volume, tipo) => volume === "kg" ? "g" : (tipo === "Adjuvante" ? "mL" : "L");
  window.formulacaoTexto = c => { const f = L.formulacoes.find(x => x[0] === c); return f ? (f[0] === "Outra" ? "Outra" : `${f[0]} – ${f[1]}`) : (c || ""); };
  window.principiosTexto = ps => (ps || []).filter(p => p && p.nome).map(p => p.nome + (p.conc ? ` (${p.conc})` : "")).join(" + ");

  function linhaPA(p, i) {
    return `<div class="pa-row" data-pa="${i}">
      <label class="f sp">Princípio ativo<input data-pf="pa-nome" list="dl-principios" value="${esc(p.nome)}" placeholder="Ex.: Aminopiralide"></label>
      <label class="f">Concentração<input data-pf="pa-conc" value="${esc(p.conc)}" placeholder="Ex.: 240 g/L"></label>
      <button type="button" class="ghost x" data-pf-acao="rm-pa" aria-label="Remover princípio ativo">✕</button>
    </div>`;
  }
  window.produtoFormHTML = (p) => {
    p = p || {};
    const pas = (p.principios && p.principios.length) ? p.principios : [{ nome: "", conc: "" }];
    return `<div class="prod-form">
      <label class="f">Nome comercial<input data-pf="nome" value="${esc(p.nome)}" required placeholder="Ex.: Tordon Ultra-S"></label>
      <label class="f">Indústria<select data-pf="industria"><option value="">Escolha…</option>${L.industrias.map(x => opt(x, x, p.industria)).join("")}</select></label>
      <div class="pa-list">${pas.map(linhaPA).join("")}</div>
      <div><button type="button" data-pf-acao="add-pa">+ Adicionar princípio ativo</button></div>
      <label class="f">Formulação<select data-pf="formulacao"><option value="">Escolha…</option>${L.formulacoes.map(f => opt(f[0], f[0] === "Outra" ? "Outra" : `${f[0]} – ${f[1]}`, p.formulacao)).join("")}</select></label>
      <div class="grid">
        <label class="f">Tipo de volume<select data-pf="volume">${L.volumes.map(v => opt(v[0], v[1], p.volume || "L")).join("")}</select></label>
        <label class="f">Tipo de produto<select data-pf="tipo">${L.tipos.map(x => opt(x, x, p.tipo || "Herbicida")).join("")}</select></label>
      </div>
      <datalist id="dl-principios">${L.principios.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    </div>`;
  };
  // Liga os botões de adicionar/remover princípio ativo dentro de um container.
  window.produtoFormLigar = (raiz) => {
    if (raiz.__pfLigado) return; raiz.__pfLigado = true;
    raiz.addEventListener("click", e => {
      const b = e.target.closest("[data-pf-acao]"); if (!b) return;
      const form = b.closest(".prod-form"); if (!form) return;
      e.preventDefault(); e.stopPropagation();
      const lista = form.querySelector(".pa-list");
      if (b.dataset.pfAcao === "add-pa") { lista.insertAdjacentHTML("beforeend", linhaPA({}, lista.children.length)); lista.lastElementChild.querySelector("input").focus(); }
      if (b.dataset.pfAcao === "rm-pa") { const r = b.closest(".pa-row"); if (lista.children.length > 1) r.remove(); else r.querySelectorAll("input").forEach(i => i.value = ""); }
    }, true);
  };
  window.produtoFormLer = (form) => {
    const v = k => (form.querySelector(`[data-pf="${k}"]`) || {}).value || "";
    const principios = [...form.querySelectorAll(".pa-row")].map(r => ({
      nome: r.querySelector('[data-pf="pa-nome"]').value.trim(),
      conc: r.querySelector('[data-pf="pa-conc"]').value.trim()
    })).filter(x => x.nome);
    const p = { nome: v("nome").trim(), industria: v("industria"), principios, formulacao: v("formulacao"), volume: v("volume") || "L", tipo: v("tipo") || "Herbicida" };
    p.unidade = window.unidadeDose(p.volume, p.tipo);
    return p;
  };
  window.produtoFormValidar = (p) => {
    if (!p.nome) return "Preencha o nome comercial.";
    if (!p.industria) return "Escolha a indústria.";
    if (!p.principios.length && p.tipo !== "Adjuvante") return "Informe pelo menos um princípio ativo.";
    if (!p.formulacao) return "Escolha a formulação.";
    return "";
  };
  window.produtoFormLigar(document);
  window.produtoId = nome => (String(nome).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "produto") + "-" + Date.now().toString(36);
})();
