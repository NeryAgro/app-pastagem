/* Painel do dono: dados dos usuários (clientes, pastos, KMLs, propostas em PDF) e exportações. */
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dec = v => { if (typeof v === "number") return v; const s = String(v == null ? "" : v).trim(); if (!s) return null; const n = s.includes(",") ? parseFloat(s.replace(/\./g, "").replace(",", ".")) : Number(s); return isFinite(n) ? n : null; };
  const fator = u => (u === "g" || u === "mL") ? 0.001 : 1;
  const fmtN = (n, d = 2) => (Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtR = n => "R$ " + fmtN(n);
  const fmtD = s => { if (!s) return ""; const d = new Date(s); return isNaN(d) ? String(s) : d.toLocaleDateString("pt-BR"); };
  const arq = s => String(s || "sem-nome").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "_").slice(0, 60) || "sem-nome";
  const hoje = () => new Date().toISOString().slice(0, 10);

  /* ---------- leitura dos dados na nuvem ---------- */
  async function lerDocs(sb, userId) {
    const out = [];
    for (let de = 0; ; de += 500) {
      let q = sb.from("docs").select("user_id,col,id,data,atualizado_em").eq("apagado", false).in("col", ["clientes", "pastos", "areas", "pdfs"]).order("atualizado_em").range(de, de + 499);
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      out.push(...data);
      if (data.length < 500) break;
    }
    const por = {};
    for (const r of out) {
      const u = por[r.user_id] = por[r.user_id] || { clientes: {}, pastos: {}, areas: {}, pdfs: {} };
      u[r.col][r.id] = r.data || {};
    }
    return por;
  }
  const areasDoPasto = p => (Array.isArray(p.areas) && p.areas.length) ? p.areas : ((p.poligono && p.poligono.length >= 3) ? [{ nome: p.nome || "Área 1", poligono: p.poligono, areaHa: p.areaHa }] : []);

  /* ---------- planilha Excel (.xlsx) ---------- */
  const xmlEsc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  function colRef(i) { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function folhaXml(linhas) {
    const rows = linhas.map((l, r) => `<row r="${r + 1}">${l.map((v, c) => {
      const ref = colRef(c) + (r + 1), st = r === 0 ? ' s="1"' : "";
      if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
      if (v == null || v === "") return "";
      return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
    }).join("")}</row>`).join("");
    const larg = (linhas[0] || []).map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(45, Math.max(10, String(h).length + 4))}" customWidth="1"/>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${larg ? `<cols>${larg}</cols>` : ""}<sheetData>${rows}</sheetData>${linhas.length > 1 ? `<autoFilter ref="A1:${colRef((linhas[0] || [""]).length - 1)}${linhas.length}"/>` : ""}</worksheet>`;
  }
  async function xlsx(folhas) {
    const z = new JSZip();
    z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${folhas.map((f, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
    z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    z.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${folhas.map((f, i) => `<sheet name="${xmlEsc(f.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${folhas.some(f => f.linhas.length > 1) ? `<definedNames>${folhas.map((f, i) => f.linhas.length > 1 ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlEsc(f.nome)}'!$A$1:$${colRef(f.linhas[0].length - 1)}$${f.linhas.length}</definedName>` : "").join("")}</definedNames>` : ""}</workbook>`);
    z.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${folhas.map((f, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${folhas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    z.file("xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF14532D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`);
    folhas.forEach((f, i) => z.file(`xl/worksheets/sheet${i + 1}.xml`, folhaXml(f.linhas)));
    return z.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  function montarPlanilha(por, perfis, filtroCliente) {
    const nomeU = id => { const p = perfis[id] || {}; return p.nome || p.email || "usuário"; };
    const CLI = [["Usuário", "Empresa do usuário", "Cliente", "Município", "UF", "Contato", "Telefone", "Nº de pastos", "Área total (ha)", "Safra da proposta", "Investimento estimado (R$)", "Custo médio (R$/ha)", "Observações"]];
    const PAS = [["Usuário", "Cliente", "Fazenda", "Pasto", "Área (ha)", "Capim", "Condição", "Modalidade", "Vazão (L/ha)", "Plantas daninhas", "Risco guarda-chuva", "Roçada", "Expectativa de controle", "Bombas 20 L/ha", "Data da visita", "Nº de KMLs", "Observações"]];
    const REC = [["Usuário", "Cliente", "Fazenda", "Pasto", "Área (ha)", "Produto", "Dose/ha", "Unidade da dose", "Preço (R$ por kg/L)", "Custo (R$/ha)", "Custo no pasto (R$)", "Volume no pasto (kg/L)", "Custo por bomba 20 L (R$)"]];
    const PDF = [["Usuário", "Cliente", "Arquivo", "Gerado em", "Safra", "Pastos", "Área (ha)", "Investimento (R$)"]];
    for (const [uid, u] of Object.entries(por)) {
      for (const [cid, c] of Object.entries(u.clientes)) {
        if (filtroCliente && cid !== filtroCliente) continue;
        const pastos = Object.values(u.pastos).filter(p => p.clienteId === cid);
        const pr = (c.proposta && c.proposta.precos) || {};
        let ha = 0, tot = 0;
        for (const p of pastos) {
          const a = dec(p.areaHa) || 0; ha += a;
          const rec = p.rec || {}, itens = (rec.itens || []).filter(i => i.produto);
          let custoHa = 0; const pb = !!rec.porBomba, nb = pb ? (dec(rec.bombasHa) || 0) : 1;
          for (const i of itens) {
            const dose = dec(i.dose) || 0, preco = dec(pr[i.produto]) || 0, f = fator(i.unidade || "L");
            const cu = dose * f * preco, ch = cu * nb; custoHa += ch;
            REC.push([nomeU(uid), c.nome || "", p.fazenda || "", p.nome || "", a, i.produto, dose, (i.unidade || "L") + (pb ? "/bomba 20 L" : "/ha"), preco || "", ch ? +ch.toFixed(2) : "", ch ? +(ch * a).toFixed(2) : "", nb ? +(dose * f * nb * a).toFixed(3) : "", pb && cu ? +cu.toFixed(2) : ""]);
          }
          tot += custoHa * a;
          PAS.push([nomeU(uid), c.nome || "", p.fazenda || "", p.nome || "", a, p.capim || "", p.condicao || "", p.modalidade || "", dec(rec.vazao) || "", (p.daninhas || []).filter(w => w && w.nome).map(w => [w.nome.split(" | ")[0], w.classe, w.estagio, w.infestacao].filter(Boolean).join(" / ")).join("; "), p.riscoGC || "", p.rocada || "", rec.expectativa || "", rec.porBomba ? (dec(rec.bombasHa) || "não estimado") : "", fmtD(p.dataVisita), areasDoPasto(p).length, p.obs || ""]);
        }
        const pf = perfis[uid] || {};
        CLI.push([nomeU(uid), pf.empresa || "", c.nome || "", c.municipio || "", c.uf || "", c.contato || "", c.telefone || "", pastos.length, +ha.toFixed(2), (c.proposta && c.proposta.safra) || "", tot ? +tot.toFixed(2) : "", ha && tot ? +(tot / ha).toFixed(2) : "", c.obs || ""]);
        for (const d of Object.values(u.pdfs).filter(d => d.clienteId === cid)) PDF.push([nomeU(uid), c.nome || d.clienteNome || "", d.nome || "", fmtD(d.criadoEm), d.safra || "", d.pastos || "", dec(d.areaHa) || "", dec(d.total) || ""]);
      }
    }
    return [{ nome: "Clientes", linhas: CLI }, { nome: "Pastos", linhas: PAS }, { nome: "Recomendações", linhas: REC }, { nome: "Propostas (PDF)", linhas: PDF }];
  }

  /* ---------- KML ---------- */
  function kml(nome, marcas) {
    const pm = marcas.map(m => `<Placemark><name>${xmlEsc(m.nome)}</name><description>${xmlEsc(m.desc || "")}</description><Polygon><outerBoundaryIs><LinearRing><coordinates>${(m.poligono || []).concat(m.poligono && m.poligono.length ? [m.poligono[0]] : []).map(([lon, lat]) => `${lon},${lat},0`).join(" ")}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`).join("");
    return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xmlEsc(nome)}</name>${pm}</Document></kml>`;
  }
  function marcasDoCliente(u, cid) {
    const out = [], vistos = new Set();
    for (const p of Object.values(u.pastos).filter(p => p.clienteId === cid)) {
      for (const a of areasDoPasto(p)) {
        if (!a.poligono || a.poligono.length < 3) continue;
        const nome = [p.fazenda, p.nome, a.nome && a.nome !== p.nome ? a.nome : ""].filter(Boolean).join(" - ");
        vistos.add(JSON.stringify(a.poligono[0]) + a.areaHa);
        out.push({ nome, poligono: a.poligono, desc: `${fmtN(a.areaHa)} ha${a.kml ? " · arquivo original: " + a.kml : ""}`, pasta: arq(p.fazenda || "Sem fazenda") });
      }
    }
    for (const a of Object.values(u.areas).filter(a => a.clienteId === cid)) {
      if (!a.poligono || a.poligono.length < 3 || vistos.has(JSON.stringify(a.poligono[0]) + a.areaHa)) continue;
      out.push({ nome: a.nome || "Área", poligono: a.poligono, desc: `${fmtN(a.areaHa)} ha · biblioteca${a.descricao ? " · " + a.descricao : ""}`, pasta: "Biblioteca" });
    }
    return out;
  }
  function kmlsNoZip(z, base, u, cid, nomeCliente) {
    const ms = marcasDoCliente(u, cid); if (!ms.length) return 0;
    z.file(`${base}${arq(nomeCliente)} - todas as areas.kml`, kml(nomeCliente, ms));
    ms.forEach((m, i) => z.file(`${base}${m.pasta}/${String(i + 1).padStart(2, "0")}_${arq(m.nome)}.kml`, kml(m.nome, [m])));
    return ms.length;
  }

  function baixar(blob, nome) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
  }

  /* ---------- tela de um usuário ---------- */
  async function abrirUsuario(raiz, sb, perfil, perfisMap, voltar) {
    raiz.innerHTML = `<div class="auth-in wide"><div class="row spread"><button class="ghost" data-pd="voltar">← Painel</button></div><p class="note">Carregando dados de ${esc(perfil.nome || perfil.email)}…</p></div>`;
    let por;
    try { por = await lerDocs(sb, perfil.id); }
    catch (e) { raiz.querySelector(".note").textContent = "Não foi possível carregar: " + (e.message || e); ligar(); return; }
    const u = por[perfil.id] || { clientes: {}, pastos: {}, areas: {}, pdfs: {} };
    const clientes = Object.entries(u.clientes).sort((a, b) => (a[1].nome || "").localeCompare(b[1].nome || "", "pt"));
    raiz.innerHTML = `<div class="auth-in wide">
      <div class="row spread"><button class="ghost" data-pd="voltar">← Painel</button></div>
      <div><div class="eyebrow">Dados do usuário</div><h1>${esc(perfil.nome || perfil.email)}</h1>
      <p class="note">${esc([perfil.empresa, [perfil.municipio, perfil.uf].filter(Boolean).join("/"), perfil.email].filter(Boolean).join(" · "))}</p></div>
      <div class="row"><button class="primary" data-pd="xlsx">Planilha (Excel)</button><button data-pd="kml-todos">Todos os KMLs (.zip)</button></div>
      <p class="auth-msg"></p>
      ${clientes.length ? clientes.map(([cid, c]) => {
        const pastos = Object.values(u.pastos).filter(p => p.clienteId === cid);
        const ha = pastos.reduce((s, p) => s + (dec(p.areaHa) || 0), 0);
        const pdfs = Object.entries(u.pdfs).filter(([, d]) => d.clienteId === cid).sort((a, b) => String(b[1].criadoEm).localeCompare(String(a[1].criadoEm)));
        const nk = marcasDoCliente(u, cid).length;
        return `<div class="card section">
          <div class="row spread"><div><b>${esc(c.nome || "(sem nome)")}</b><br><span class="note">${esc([[c.municipio, c.uf].filter(Boolean).join("/"), c.contato, c.telefone].filter(Boolean).join(" · "))}</span></div></div>
          <p class="note">${pastos.length} pasto(s) · ${fmtN(ha)} ha · ${nk} área(s) com KML${c.proposta && c.proposta.safra ? " · safra " + esc(c.proposta.safra) : ""}</p>
          <div class="row"><button data-pd="xlsx-cli" data-cid="${esc(cid)}">Planilha do cliente</button>${nk ? `<button data-pd="kml-cli" data-cid="${esc(cid)}">KMLs (.zip)</button>` : ""}</div>
          ${pdfs.length ? `<div class="pdf-lista"><b class="note">Propostas em PDF</b>${pdfs.map(([id, d]) => `<div class="pdf-item"><span>${esc(d.nome || "proposta.pdf")}<br><span class="note">${esc(fmtD(d.criadoEm))}${d.safra ? " · safra " + esc(d.safra) : ""}${d.total ? " · " + fmtR(d.total) : ""}</span></span><button data-pd="pdf" data-arq="${esc(d.arquivo)}" data-nome="${esc(d.nome)}">Baixar PDF</button></div>`).join("")}</div>` : `<p class="note">Nenhuma proposta em PDF gerada ainda.</p>`}
        </div>`;
      }).join("") : `<p class="note">Este usuário ainda não cadastrou clientes.</p>`}
    </div>`;
    const m = raiz.querySelector(".auth-msg");
    const aviso = (t, err) => { if (m) { m.textContent = t; m.classList.toggle("err", !!err); } };
    raiz.__pd = async (b) => {
      const a = b.dataset.pd, nomeU = arq(perfil.nome || perfil.email);
      try {
        if (a === "xlsx") { b.disabled = true; baixar(await xlsx(montarPlanilha(por, perfisMap)), `Dados_${nomeU}_${hoje()}.xlsx`); }
        else if (a === "xlsx-cli") { b.disabled = true; const c = u.clientes[b.dataset.cid] || {}; baixar(await xlsx(montarPlanilha(por, perfisMap, b.dataset.cid)), `Cliente_${arq(c.nome)}_${hoje()}.xlsx`); }
        else if (a === "kml-cli") { b.disabled = true; const c = u.clientes[b.dataset.cid] || {}; const z = new JSZip(); kmlsNoZip(z, "", u, b.dataset.cid, c.nome || "Cliente"); baixar(await z.generateAsync({ type: "blob" }), `KMLs_${arq(c.nome)}.zip`); }
        else if (a === "kml-todos") { b.disabled = true; const z = new JSZip(); let n = 0; for (const [cid, c] of clientes) n += kmlsNoZip(z, arq(c.nome) + "/", u, cid, c.nome || "Cliente"); if (!n) { aviso("Nenhum KML encontrado para este usuário."); b.disabled = false; return; } baixar(await z.generateAsync({ type: "blob" }), `KMLs_${nomeU}.zip`); }
        else if (a === "pdf") { b.disabled = true; const { data, error } = await sb.storage.from("propostas").createSignedUrl(b.dataset.arq, 300, { download: b.dataset.nome || true }); if (error) throw error; location.href = data.signedUrl; }
        b.disabled = false;
      } catch (e) { b.disabled = false; aviso("Não foi possível: " + (e.message || e), true); }
    };
    ligar();
    function ligar() {
      if (raiz.__pdLigado) return; raiz.__pdLigado = true;
      raiz.addEventListener("click", e => {
        const b = e.target.closest("[data-pd]"); if (!b) return;
        e.preventDefault();
        if (b.dataset.pd === "voltar") { raiz.__pd = null; voltar(); return; }
        if (raiz.__pd) raiz.__pd(b);
      });
    }
  }

  async function planilhaTodos(sb, perfisMap) {
    const por = await lerDocs(sb, null);
    baixar(await xlsx(montarPlanilha(por, perfisMap)), `Dados_todos_usuarios_${hoje()}.xlsx`);
  }

  window.__painelDados = { abrirUsuario, planilhaTodos, _montarPlanilha: montarPlanilha, _xlsx: xlsx, _kml: kml };
})();
