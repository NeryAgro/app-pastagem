
(() => {
const DANINHAS = ["Alecrim","Alecrim-do-campo","Algodão-de-seda","Amarelinho","Angiquinho","Araçá-do-campo","Araticum-miúdo","Arnica | Mata-pasto","Aroeira","Aroeira-preta","Aromita","Arranha-gato","Assa-peixe-branco","Assa-peixe-roxo","Ata-brava","Barbatimão","Bolsa-de-pastor","Botão-do-Ênio | Vassoura-de-botão","Branqueja","Cabriteiro","Cafezinho","Cagaita","Canela-de-perdiz","Caneleiro | Faveira","Canjoão","Cansanção","Capa-bode","Capim-amargoso","Capim-annoni","Capim-capeta","Capim-navalha","Capitão-do-campo","Caraguatá","Cardo-mariano","Carqueja","Carqueja (NE)","Carrancudo","Carrasco | Canela-de-velho","Caruru-roxo","Casadinha","Catingueira | Catinga-de-porco","Cheirosa","Chumbinho","Ciganinha","Cipó-de-são-joão","Cipó-escada","Cipó-lixa | Cipó-de-fogo","Cipó-mucunã","Cipó-preto","Crista-de-galo","Cumbuquinha","Erva-de-rato","Erva-quente","Espinho-agulha","Espinilho","Farinha-seca","Fedegoso-branco","Fedegoso-gigante","Fedegoso-preto","Fumo-bravo","Gervão-roxo","Goiabinha","Grão-de-galo","Guanxuma","Guanxuma-branca","Guanxuma-vassourinha","Ipê-amarelo-cascudo","Ipê-bucho-de-boi","Jaborandi","Japecanga","Jatobá-do-cerrado","Joá-bravo","Juá-mirim","Joá-vermelho","Juazeiro","Jurema (NE)","Jurubebão","Lacre-branco","Lacre-roxo","Leiteira | Amendoim-bravo","Leiteiro","Limãozinho","Lírio-do-brejo","Lixeira","Lobeira","Malição","Malícia","Malva-branca | Guanxuma","Malva-carrapicho","Malva-de-nambu","Malva-relógio","Malva-veludo","Malvarisco | Malva-roxa","Mama-cadela","Maria-mole | Berneira","Maria-preta | Erva-baleeira","Maricá","Marinheiro","Marmeleiro","Marolinho","Marolo","Mata-barata","Miroró","Pata-de-vaca (forficata)","Pata-de-vaca (variegata)","Pau-d’olinho","Pau-terra","Pitiruna","Pixirica","Quaresmeira","Rama-de-bezerro","Santaneira","Tingui (pubescens)","Tingui (pubiflora)","Trapoeraba","Vareta-de-rojão","Vassoureira","Velame","Xique-xique | Guizo-de-cascavel"];
const CAPINS = ["Brachiaria brizantha cv. Marandu","Brachiaria brizantha cv. Piatã","Brachiaria brizantha cv. Xaraés","Brachiaria brizantha cv. BRS Paiaguás","Brachiaria decumbens","Brachiaria humidicola","Brachiaria ruziziensis","Brachiaria híbrida (Mulato II / Ipyporã / Sabiá)","Panicum maximum cv. Mombaça","Panicum maximum cv. Tanzânia","Panicum maximum cv. Massai","Panicum maximum cv. Zuri","Panicum maximum cv. Quênia","Andropogon","Tifton / Cynodon","Capim nativo"];
const CLASSES = ["Mole","Mediana","Dura"];
const ESTAGIOS = ["Plântula","Vegetativo jovem","Vegetativo adulto","Florescimento","Frutificação","Rebrota pós-roçada"];
const INFEST = ["Baixa","Média","Alta"];
const CONDICAO = ["Boa","Regular","Degradada","Em reforma"];
const MODALIDADES = ["Drone","Trator","Drone e trator","Aérea (avião)","Localizada – foliar (costal)","Localizada – toco"];
const MOD_ANTIGA = {"Costal / catação":"Localizada – foliar (costal)","Toco":"Localizada – toco"};
const ehLocal = m => /localizada|costal|cata[cç][aã]o|toco/i.test(m||"");
const BOMBA = 20; // litros por bomba costal
const ROCADA = ["Não","Sim, antes da aplicação","Sim, depois da aplicação"];
const UNIDADES = ["L","kg","mL","g"];
const TIPOS = ["Herbicida","Adjuvante","Outro"];
const brl = n => (Number(n)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fmtN = (n,d=2) => (Number(n)||0).toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtDose = n => (Number(n)||0).toLocaleString("pt-BR",{maximumFractionDigits:3});
function dec(v){ if(typeof v==="number") return v; const s=String(v??"").trim(); if(!s) return null; const n=s.includes(",")?parseFloat(s.replace(/\./g,"").replace(",",".")):Number(s); return isFinite(n)?n:null; }
const decStr = v => v==null||v===""?"":String(v).replace(".",",");
function volTot(itens){ const u={}; itens.forEach(i=>{ u[i.unidade]=(u[i.unidade]||0)+i.volume; }); return Object.entries(u).map(([k,v])=>`${fmtN(v,1)} ${k}`).join(" + ")||"0"; }
const fator = u => (u==="g"||u==="mL")?0.001:1;            // dose em g ou mL, preço por kg ou L
const uCompra = u => u==="g"?"kg":u==="mL"?"L":(u||"L");
const custoItem = (i,pr) => (dec(i.dose)||0)*fator(i.unidade||"L")*(dec(pr?.[i.produto])||0);   // por ha, ou por bomba na aplicação localizada
const custoBomba = (rec,pr) => (rec?.itens||[]).reduce((s,i)=>s+custoItem(i,pr),0);
const bombasHa = rec => rec?.porBomba ? (dec(rec.bombasHa)||0) : 1;
const doseHa = (i,rec) => (dec(i.dose)||0)*bombasHa(rec);                                     // dose por ha (na localizada: dose/bomba × bombas/ha)
function recCusto(rec,pr){ return custoBomba(rec,pr)*bombasHa(rec); }                           // R$/ha (0 na localizada sem bombas/ha)
const semEstimativa = rec => rec?.porBomba && !dec(rec.bombasHa);
function custoHaTxt(rec,pr){ return semEstimativa(rec) ? brl(custoBomba(rec,pr))+"/bomba" : brl(recCusto(rec,pr)); }
const unidBomba = u => (u==="kg"||u==="g") ? "g" : "mL";
function precosDe(cid){ if(S.view.name==="proposta"&&S.view.id===cid&&S.draft?.precos) return S.draft.precos; return cliente(cid)?.proposta?.precos||{}; }
const temPreco = pr => Object.values(pr||{}).some(v=>dec(v));
function temRec(p){ return (p.rec?.itens||[]).some(i=>i.produto&&dec(i.dose)); }
function safraAtual(){ const d=new Date(); const y=d.getMonth()>=6?d.getFullYear():d.getFullYear()-1; return `${y}/${String((y+1)%100).padStart(2,"0")}`; }
document.getElementById("dl-daninhas").innerHTML = DANINHAS.map(d=>`<option value="${d}">`).join("");
document.getElementById("dl-capim").innerHTML = CAPINS.map(d=>`<option value="${d}">`).join("");

const $app = document.getElementById("app");
const $sync = document.getElementById("sync");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtHa = n => (Number(n)||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const today = () => { const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const fmtDate = s => s ? s.split("-").reverse().join("/") : "";
const clone = o => JSON.parse(JSON.stringify(o));

let db=null, assets=null, downloads=null;
const S = { clientes:[], pastos:[], produtos:[], config:{}, biblio:[], qa:"", picker:false, qp:"", loaded:{c:false,p:false}, view:{name:"lista"}, draft:null, dirty:false, q:"", busy:false, armed:null, importing:null };

function toast(msg){ const t=document.getElementById("toastSlot"); t.innerHTML=`<div class="toast" role="status">${esc(msg)}</div>`; clearTimeout(toast._t); toast._t=setTimeout(()=>t.innerHTML="",2600); }
function setSync(msg, err){ $sync.textContent=msg; $sync.classList.toggle("err",!!err); }

/* ---------- geo ---------- */
function ringArea(c){ // m², esférica
  const R=6378137; let a=0; const n=c.length;
  for(let i=0;i<n;i++){ const [x1,y1]=c[i],[x2,y2]=c[(i+1)%n]; a += (x2-x1)*Math.PI/180*(2+Math.sin(y1*Math.PI/180)+Math.sin(y2*Math.PI/180)); }
  return Math.abs(a*R*R/2);
}
function hav(a,b){ const R=6371008.8,r=Math.PI/180; const dLat=(b[1]-a[1])*r,dLon=(b[0]-a[0])*r; const h=Math.sin(dLat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
function perim(c){ let p=0; for(let i=0;i<c.length;i++) p+=hav(c[i],c[(i+1)%c.length]); return p; }
function centroid(c){ let x=0,y=0; c.forEach(p=>{x+=p[0];y+=p[1]}); return [x/c.length,y/c.length]; }
function cleanRing(c){ const out=[]; c.forEach(p=>{ const l=out[out.length-1]; if(!l||l[0]!==p[0]||l[1]!==p[1]) out.push(p); }); if(out.length>1){const f=out[0],l=out[out.length-1]; if(f[0]===l[0]&&f[1]===l[1]) out.pop();} return out; }
function parseKml(text){
  const doc=new DOMParser().parseFromString(text,"application/xml");
  if(doc.getElementsByTagName("parsererror").length) throw new Error("O arquivo não é um KML válido.");
  const res=[];
  for(const pm of Array.from(doc.getElementsByTagNameNS("*","Placemark"))){
    const name=(pm.getElementsByTagNameNS("*","name")[0]?.textContent||"").trim();
    for(const poly of Array.from(pm.getElementsByTagNameNS("*","Polygon"))){
      const ob=poly.getElementsByTagNameNS("*","outerBoundaryIs")[0]||poly;
      const co=ob.getElementsByTagNameNS("*","coordinates")[0]; if(!co) continue;
      const ring=cleanRing(co.textContent.trim().split(/\s+/).map(t=>t.split(",").map(Number)).filter(p=>p.length>=2&&isFinite(p[0])&&isFinite(p[1])).map(p=>[+p[0].toFixed(7),+p[1].toFixed(7)]));
      if(ring.length<3) continue;
      const desc=(pm.getElementsByTagNameNS("*","description")[0]?.textContent||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
      res.push({nome:name||`Área ${res.length+1}`, descricao:desc, poligono:ring, areaHa:+(ringArea(ring)/1e4).toFixed(2)});
    }
    // alguns apps gravam a área como linha fechada (LineString) em vez de polígono
    if(!pm.getElementsByTagNameNS("*","Polygon").length) for(const ls of Array.from(pm.getElementsByTagNameNS("*","LineString"))){
      const co=ls.getElementsByTagNameNS("*","coordinates")[0]; if(!co) continue;
      const pts=co.textContent.trim().split(/\s+/).map(t=>t.split(",").map(Number)).filter(p=>p.length>=2&&isFinite(p[0])&&isFinite(p[1]));
      if(pts.length<4) continue; const f=pts[0], l=pts[pts.length-1]; if(Math.abs(f[0]-l[0])>1e-6||Math.abs(f[1]-l[1])>1e-6) continue;
      const ring=cleanRing(pts.map(p=>[+p[0].toFixed(7),+p[1].toFixed(7)])); if(ring.length<3) continue;
      res.push({nome:name||`Área ${res.length+1}`, descricao:"", poligono:ring, areaHa:+(ringArea(ring)/1e4).toFixed(2)});
    }
  }
  if(!res.length) throw new Error("Nenhum polígono encontrado no arquivo. Exporte a área como KML ou KMZ no Field Area Measure.");
  return res;
}
async function readGeoFile(file){
  // Não confia na extensão: arquivos vindos do WhatsApp, Drive ou "Arquivos" às vezes chegam renomeados.
  const buf=new Uint8Array(await file.arrayBuffer());
  if(!buf.length) throw new Error(`O arquivo "${file.name}" está vazio. Exporte de novo no Field Area Measure.`);
  if(buf[0]===0x50&&buf[1]===0x4B){ // "PK" = arquivo compactado (KMZ)
    if(!window.JSZip) throw new Error("Não consegui abrir KMZ agora. Exporte em KML e tente de novo.");
    const zip=await JSZip.loadAsync(buf); const k=Object.keys(zip.files).find(n=>/\.kml$/i.test(n))||Object.keys(zip.files).find(n=>!zip.files[n].dir);
    if(!k) throw new Error("O KMZ não tem um arquivo KML dentro.");
    return parseKml(await zip.files[k].async("string"));
  }
  const txt=new TextDecoder("utf-8").decode(buf).replace(/^\uFEFF/,"");
  if(!/<kml[\s>]/i.test(txt.slice(0,4000))&&!/<Placemark/i.test(txt)) throw new Error(`"${file.name}" não é um arquivo KML ou KMZ. No Field Area Measure, exporte a área como KML ou KMZ.`);
  return parseKml(txt);
}
function polySvg(list){
  list=(list||[]).filter(c=>c&&c.length>=3); if(!list.length) return "";
  const all=list.flat(); const lat0=centroid(all)[1]*Math.PI/180, k=Math.cos(lat0);
  const P=list.map(c=>c.map(p=>[p[0]*k,-p[1]])); const fl=P.flat();
  const xs=fl.map(p=>p[0]),ys=fl.map(p=>p[1]);
  const minx=Math.min(...xs),maxx=Math.max(...xs),miny=Math.min(...ys),maxy=Math.max(...ys);
  const W=220,H=160,pad=12,s=Math.min((W-2*pad)/(maxx-minx||1),(H-2*pad)/(maxy-miny||1));
  const ox=(W-(maxx-minx)*s)/2,oy=(H-(maxy-miny)*s)/2;
  const X=p=>((p[0]-minx)*s+ox),Y=p=>((p[1]-miny)*s+oy);
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Contorno das áreas do pasto">${P.map((pts,i)=>{const d=pts.map(p=>`${X(p).toFixed(1)},${Y(p).toFixed(1)}`).join(" ");const c=centroid(pts);
    return `<polygon points="${d}" fill="var(--grass)" fill-opacity=".28" stroke="var(--grass)" stroke-width="2" stroke-linejoin="round"/>${P.length>1?`<text x="${X(c).toFixed(1)}" y="${Y(c).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="var(--fg)">${i+1}</text>`:""}`}).join("")}</svg>`;
}
function areasDe(p){ if(Array.isArray(p.areas)&&p.areas.length) return p.areas; if(p.poligono&&p.poligono.length>=3) return [{nome:p.nome||"Área 1",poligono:p.poligono,areaHa:+(ringArea(p.poligono)/1e4).toFixed(2),kml:p.kml||""}]; return []; }
function somaAreas(){ const t=S.draft.areas.reduce((s,a)=>s+(+a.areaHa||0),0); S.draft.areaHa=t?t.toFixed(2).replace(".",","):""; }

/* ---------- photos ---------- */
async function shrink(file){
  try{
    const bmp=await createImageBitmap(file); const max=1600; const r=Math.min(1,max/Math.max(bmp.width,bmp.height));
    const cv=document.createElement("canvas"); cv.width=Math.round(bmp.width*r); cv.height=Math.round(bmp.height*r);
    cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);
    return await new Promise(res=>cv.toBlob(b=>res(b||file),"image/jpeg",.82));
  }catch(e){ return file; }
}

/* ---------- data ---------- */
const pastosDe = id => S.pastos.filter(p=>p.clienteId===id).sort((a,b)=>(a.fazenda||"").localeCompare(b.fazenda||"","pt")||(a.nome||"").localeCompare(b.nome||"","pt",{numeric:true}));
const cliente = id => S.clientes.find(c=>c.id===id);
async function write(ref, data, okMsg){
  S.busy=true; render();
  try{ await ref.set(data); if(okMsg) toast(okMsg); return true; }
  catch(e){
    if(e?.code==="unavailable"){ try{ await new Promise(r=>setTimeout(r,600+Math.random()*600)); await ref.set(data); if(okMsg) toast(okMsg); return true; }catch(e2){ e=e2; } }
    toast(e?.code==="quota_exceeded"?"Limite de armazenamento atingido.":e?.code==="invalid_argument"?"Você não tem permissão para salvar aqui.":"Não foi possível salvar. Verifique a internet e tente de novo.");
    return false;
  } finally { S.busy=false; render(); }
}
async function remove(ref, okMsg){ try{ await ref.delete(); toast(okMsg); return true; }catch(e){ toast("Não foi possível excluir. Tente de novo."); return false; } }

/* ---------- navigation ---------- */
function go(view){
  if(S.dirty && !view.force){ S.pending=view; render(); return; }
  S.pending=null; S.dirty=false; S.armed=null; S.importing=null; S.picker=false;
  if(view.name==="cliente"){ const c=view.id?cliente(view.id):null; S.draft=c?clone(c):{nome:"",municipio:"",uf:"",contato:"",telefone:"",tecnico:"",obs:""}; S.draft.rel=relDe(c); }
  if(view.name==="pasto"){ const p=view.id?S.pastos.find(x=>x.id===view.id):null; S.draft=p?clone(p):{clienteId:view.clienteId,fazenda:view.fazenda||"",nome:"",areaHa:"",capim:"",condicao:"",modalidade:"",daninhas:[{nome:"",classe:"",estagio:"",infestacao:""}],riscoGC:"",riscoGCNota:"",rocada:"",rocadaNota:"",fotos:[],poligono:null,kml:"",obs:"",dataVisita:today()}; }
  if(view.name==="pasto"){ S.draft.daninhas=S.draft.daninhas||[]; S.draft.fotos=S.draft.fotos||[]; if(!S.draft.daninhas.length) S.draft.daninhas.push({nome:"",classe:"",estagio:"",infestacao:""}); if(typeof S.draft.areaHa==="number") S.draft.areaHa=String(S.draft.areaHa).replace(".",","); S.draft.areas=clone(areasDe(S.draft)); delete S.draft.poligono; delete S.draft.kml; if(MOD_ANTIGA[S.draft.modalidade]) S.draft.modalidade=MOD_ANTIGA[S.draft.modalidade]; }
  if(view.name==="pasto"){ const r=S.draft.rec||{}; S.draft.rec={itens:(r.itens||[]).map(i=>({produto:i.produto,produtoId:i.produtoId||"",unidade:i.unidade||"L",dose:decStr(i.dose)})),obs:r.obs||"",expectativa:r.expectativa||"",vazao:decStr(r.vazao),porBomba:!!r.porBomba,bombasHa:decStr(r.bombasHa)};
    if(ehLocal(S.draft.modalidade)&&!S.draft.rec.porBomba&&!S.draft.rec.itens.some(i=>dec(i.dose))) ajustarModo(); }
  if(view.name==="ajustes"){ S.draft={config:{empresa:"",responsavel:"",registro:"",telefone:"",email:"",...S.config},produtos:S.produtos.map(p=>({...p})),removidos:[]}; }
  if(view.name==="proposta"){ const c=cliente(view.id)||{}; const pr=c.proposta||{};
    const precos={}; Object.entries(pr.precos||{}).forEach(([k,v])=>precos[k]=decStr(v));
    S.draft={precos,safra:pr.safra||safraAtual(),data:pr.data||today(),validade:pr.validade||"15 dias",pagamento:pr.pagamento||"",obsTec:pr.obsTec||"",obsCom:pr.obsCom||"",excluir:pr.excluir||[]}; }
  if(view.name==="lista") S.draft=null;
  S.view=view; render(); window.scrollTo(0,0);
}

/* ---------- views ---------- */
function vLista(){
  const q=S.q.trim().toLowerCase();
  const list=S.clientes.filter(c=>!q||[c.nome,c.municipio].join(" ").toLowerCase().includes(q)).sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt"));
  const ready=S.loaded.c&&S.loaded.p;
  return `
  <div class="row spread"><div><div class="eyebrow">Clientes</div><h1>Levantamentos de campo</h1></div>
    <button class="primary" data-a="novo-cliente">+ Novo cliente</button></div>
  ${S.clientes.length>4?`<input type="search" id="q" placeholder="Buscar cliente ou município" value="${esc(S.q)}" aria-label="Buscar cliente">`:""}
  <div class="list">${!ready?`<div class="card empty"><b>Carregando…</b></div>`:list.length?list.map(c=>{
    const ps=pastosDe(c.id); const ha=ps.reduce((s,p)=>s+(+p.areaHa||0),0); const faz=new Set(ps.map(p=>p.fazenda).filter(Boolean)).size;
    const pend=ps.filter(p=>!p.capim||!(p.daninhas||[]).some(d=>d.nome&&d.estagio)).length;
    return `<button class="card item" data-a="abrir-cliente" data-id="${c.id}">
      <span class="t">${esc(c.nome||"Sem nome")}</span>
      <span class="n">${fmtHa(ha)}<small>ha</small></span>
      <span class="s">${esc([c.municipio,c.uf].filter(Boolean).join(" / ")||"Município não informado")} · ${faz} fazenda${faz===1?"":"s"} · ${ps.length} pasto${ps.length===1?"":"s"}</span>
      ${pend?`<span class="chips"><span class="chip warn">${pend} pasto${pend===1?"":"s"} com levantamento incompleto</span></span>`:""}
    </button>`;}).join(""):`<div class="card empty"><b>${q?"Nenhum cliente encontrado":"Nenhum cliente ainda"}</b>${q?"Tente outro nome.":"Toque em “Novo cliente” para começar o primeiro levantamento."}</div>`}</div>`;
}

function relDe(c){ const b=(c&&c.rel)||{empresa:"",...S.config}; return {empresa:b.empresa||"",responsavel:b.responsavel||"",telefone:b.telefone||"",email:b.email||"",logo:S.config.logo||"",logoW:S.config.logoW||0,logoH:S.config.logoH||0}; }
function vCliente(){
  const d=S.draft, isNew=!S.view.id, ps=isNew?[]:pastosDe(S.view.id);
  const ha=ps.reduce((s,p)=>s+(+p.areaHa||0),0);
  const fazendas=[...new Set(ps.map(p=>p.fazenda||"Sem fazenda"))];
  const imp=S.importing;
  return `
  <div><button class="crumb" data-a="voltar-lista">← Clientes</button></div>
  <div><div class="eyebrow">${isNew?"Novo cliente":"Cliente"}</div><h1>${esc(d.nome||"Novo cliente")}</h1></div>
  <section class="card section">
    <div class="grid">
      <label class="f full">Nome do cliente / produtor<input id="c-nome" data-f="nome" value="${esc(d.nome)}" placeholder="Ex.: Sr. José Sousa"></label>
      <label class="f">Município<input id="c-mun" data-f="municipio" value="${esc(d.municipio)}"></label>
      <label class="f">UF<input id="c-uf" data-f="uf" value="${esc(d.uf)}" maxlength="2" style="text-transform:uppercase"></label>
      <label class="f">Contato na fazenda<input id="c-contato" data-f="contato" value="${esc(d.contato)}" placeholder="Gerente, capataz…"></label>
      <label class="f">Telefone<input id="c-tel" data-f="telefone" value="${esc(d.telefone)}" inputmode="tel"></label>
      <label class="f full">Observações<textarea id="c-obs" data-f="obs">${esc(d.obs)}</textarea></label>
    </div>
    <h2 style="margin-top:6px">Dados que aparecem no relatório</h2>
    <p class="note" style="margin-top:-4px">Valem só para este cliente. Novos clientes começam com os últimos dados usados.</p>
    <div class="grid">
      <label class="f">Distribuidor<input id="cr-emp" data-rel="empresa" value="${esc(d.rel.empresa)}"></label>
      <label class="f">Responsável técnico<input id="cr-resp" data-rel="responsavel" value="${esc(d.rel.responsavel)}" placeholder="Seu nome"></label>
      <label class="f">Telefone<input id="cr-tel" data-rel="telefone" value="${esc(d.rel.telefone)}" inputmode="tel"></label>
      <label class="f">E-mail<input id="cr-mail" data-rel="email" value="${esc(d.rel.email)}" inputmode="email"></label>
    </div>
    <div class="row">
      <button class="primary" data-a="salvar-cliente" ${S.busy?"disabled":""}>${isNew?"Criar cliente":"Salvar dados do cliente"}</button>
      ${isNew?"":`<button class="danger ${S.armed==="cli"?"armed":""}" data-a="excluir-cliente">${S.armed==="cli"?"Confirmar: excluir cliente e pastos":"Excluir cliente"}</button>`}
    </div>
  </section>
  ${isNew?"":(()=>{const ps2=pastosDe(S.view.id); const pr=precosDe(S.view.id); const rs=resumo(ps2.filter(temRec),pr); return `<section class="card prop-cta"><div class="money"><div><b>${ps2.filter(temRec).length} de ${ps2.length}</b><span>pastos com recomendação</span></div><div><b>${temPreco(pr)?brl(rs.total):"Sem preços"}</b><span>investimento</span></div></div><button class="primary" data-a="abrir-proposta" data-id="${S.view.id}">Proposta e PDF</button></section>`})()}
  ${isNew?`<p class="note">Depois de criar o cliente você cadastra os pastos, um a um ou importando o KML do Field Area Measure.</p>`:`
  <div class="row spread"><div class="tot"><div><b>${ps.length}</b><span>pastos</span></div><div><b>${fmtHa(ha)}</b><span>hectares</span></div><div><b>${fazendas.filter(f=>f!=="Sem fazenda").length}</b><span>fazendas</span></div></div>
    <div class="row"><label class="btn file-btn">Importar KML/KMZ<input type="file" id="kml-cli" multiple></label>
    <button class="primary" data-a="novo-pasto">+ Novo pasto</button></div></div>
  ${imp?`<div class="inline">
    <h2>${imp.itens.length} área${imp.itens.length===1?"":"s"} encontrada${imp.itens.length===1?"":"s"} no arquivo</h2>
    <label class="f">Fazenda dessas áreas<input id="imp-faz" list="dl-faz" value="${esc(imp.fazenda)}" placeholder="Ex.: Fazenda Montes Claros"></label>
    <datalist id="dl-faz">${fazendas.map(f=>`<option value="${esc(f)}">`).join("")}</datalist>
    <div class="note">${imp.itens.map(i=>`${esc(i.nome)}: <span class="mono">${fmtHa(i.areaHa)} ha</span>`).join(" · ")}</div>
    ${imp.itens.length>1?`<div class="seg" role="group"><button type="button" data-a="modo-import" data-v="separado" aria-pressed="${imp.modo==="separado"}">Um pasto por área</button><button type="button" data-a="modo-import" data-v="junto" aria-pressed="${imp.modo==="junto"}">Tudo em um pasto</button></div>`:""}
    ${imp.modo==="junto"&&imp.itens.length>1?`<label class="f">Nome do pasto<input id="imp-nome" value="${esc(imp.nome)}" placeholder="Ex.: Pasto 12"></label>`:""}
    <div class="row"><button class="primary" data-a="confirmar-import" ${S.busy?"disabled":""}>${imp.modo==="junto"&&imp.itens.length>1?`Criar 1 pasto com ${imp.itens.length} áreas`:`Criar ${imp.itens.length} pasto${imp.itens.length===1?"":"s"}`}</button><button class="ghost" data-a="cancelar-import">Cancelar</button></div>
  </div>`:""}
  <div class="list">${ps.length?fazendas.map(f=>{const g=ps.filter(p=>(p.fazenda||"Sem fazenda")===f);return `
    <div class="group-h"><b>${esc(f)}</b><span>${fmtHa(g.reduce((s,p)=>s+(+p.areaHa||0),0))} ha</span></div>
    ${g.map(pastoItem).join("")}`}).join(""):`<div class="card empty"><b>Nenhum pasto cadastrado</b>Cadastre o primeiro pasto ou importe o KML exportado do Field Area Measure.</div>`}</div>`}`;
}
function pastoItem(p){
  const dn=(p.daninhas||[]).filter(d=>d.nome);
  const ok=p.capim&&dn.some(d=>d.estagio);
  const rc=p.riscoGC==="Alto"?"bad":p.riscoGC==="Médio"?"warn":p.riscoGC==="Baixo"?"ok":"";
  return `<button class="card item" data-a="abrir-pasto" data-id="${p.id}">
    <span class="t">${esc(p.nome||"Pasto sem nome")}</span>
    <span class="n">${fmtHa(p.areaHa)}<small>ha</small></span>
    <span class="s">${esc(p.capim||"Capim não informado")}${dn.length?" · "+esc(dn.map(d=>d.nome.split(" | ")[0]).join(", ")):""}</span>
    <span class="chips">
      ${ok?`<span class="chip ok">Levantamento completo</span>`:`<span class="chip warn">Incompleto</span>`}
      ${temRec(p)?`<span class="chip ok">${temPreco(precosDe(p.clienteId))?custoHaTxt(p.rec,precosDe(p.clienteId))+(semEstimativa(p.rec)?"":"/ha"):"Com recomendação"}</span>`:`<span class="chip">Sem recomendação</span>`}
      ${p.riscoGC?`<span class="chip ${rc}">Guarda-chuva: ${esc(p.riscoGC)}</span>`:""}
      ${p.rocada&&p.rocada!=="Não"?`<span class="chip">Roçada</span>`:""}
      ${areasDe(p).length?`<span class="chip">Mapa${areasDe(p).length>1?` · ${areasDe(p).length} áreas`:""}</span>`:""}
      ${(p.fotos||[]).length?`<span class="chip">${p.fotos.length} foto${p.fotos.length===1?"":"s"}</span>`:""}
      ${p.dataVisita?`<span class="chip">${fmtDate(p.dataVisita)}</span>`:""}
    </span></button>`;
}
const opts=(arr,v,ph)=>`<option value="">${ph||"Selecione"}</option>`+arr.map(o=>`<option ${o===v?"selected":""}>${esc(o)}</option>`).join("");
const seg=(field,arr,v,cls="")=>`<div class="seg ${cls}" role="group">${arr.map(o=>`<button type="button" data-seg="${field}" data-v="${esc(o)}" aria-pressed="${o===v}">${esc(o)}</button>`).join("")}</div>`;

function vPasto(){
  const d=S.draft, isNew=!S.view.id, c=cliente(d.clienteId);
  const fazendas=[...new Set(pastosDe(d.clienteId).map(p=>p.fazenda).filter(Boolean))];
  const areas=d.areas||[];
  return `
  <div><button class="crumb" data-a="voltar-cliente">← ${esc(c?.nome||"Cliente")}</button></div>
  <div><div class="eyebrow">${isNew?"Novo pasto":esc(d.fazenda||"Pasto")}</div><h1>${esc(d.nome||"Novo pasto")}</h1></div>

  <section class="card section">
    <h2>Identificação</h2>
    <div class="grid">
      <label class="f">Fazenda<input id="p-faz" data-f="fazenda" list="dl-faz2" value="${esc(d.fazenda)}" placeholder="Ex.: Fazenda Montes Claros"><datalist id="dl-faz2">${fazendas.map(f=>`<option value="${esc(f)}">`).join("")}</datalist></label>
      <label class="f">Pasto / talhão<input id="p-nome" data-f="nome" value="${esc(d.nome)}" placeholder="Ex.: Pasto 12"></label>
      <label class="f">Data da visita<input id="p-data" type="date" data-f="dataVisita" value="${esc(d.dataVisita)}"></label>
      <label class="f">Área (ha)<input id="p-area" class="mono" data-f="areaHa" inputmode="decimal" value="${esc(d.areaHa)}" placeholder="0,00"></label>
    </div>
  </section>

  <section class="card section">
    <div class="row spread"><h2>Mapa da área</h2><label class="btn file-btn">${areas.length?"+ Adicionar KML/KMZ":"Importar KML/KMZ"}<input type="file" id="kml-pasto" multiple></label></div>
    <div><button data-a="toggle-picker">${S.picker?"Fechar biblioteca":"Escolher da biblioteca de áreas"}</button></div>
    ${S.picker?vPicker(d):""}
    ${areas.length?(()=>{const all=areas.map(x=>x.poligono).flat();const ct=centroid(all);const tot=areas.reduce((s,x)=>s+(+x.areaHa||0),0);return `<div class="map">${polySvg(areas.map(x=>x.poligono))}<dl class="kv">
      <dt>Áreas</dt><dd>${areas.length}</dd>
      <dt>Soma das áreas</dt><dd>${fmtHa(tot)} ha</dd>
      <dt>Perímetro total</dt><dd>${(areas.reduce((s,x)=>s+perim(x.poligono),0)/1000).toLocaleString("pt-BR",{maximumFractionDigits:2})} km</dd>
      <dt>Centro</dt><dd>${ct[1].toFixed(5)}, ${ct[0].toFixed(5)}</dd>
      <dt></dt><dd><a href="https://www.google.com/maps?q=${ct[1].toFixed(6)},${ct[0].toFixed(6)}" target="_blank" rel="noopener">Abrir no Google Maps</a></dd>
    </dl></div>
    <div class="list">${areas.map((x,i)=>`<div class="arow"><span class="num">${i+1}</span><input id="ar-${i}" data-area="${i}" value="${esc(x.nome)}" aria-label="Nome da área ${i+1}"><span class="mono">${fmtHa(x.areaHa)} ha</span><button class="ghost x" data-a="rm-area" data-i="${i}" aria-label="Remover área ${i+1}">✕</button></div>`).join("")}</div>
    <p class="note">A área do pasto é a soma das áreas importadas. Você pode corrigir o valor no campo Área (ha) se precisar.</p>`})():`<p class="note">No Field Area Measure, exporte a área medida em KML ou KMZ e importe aqui. Pode importar vários arquivos para o mesmo pasto; a área em hectares é somada automaticamente.</p>`}
  </section>

  <section class="card section">
    <h2>Pastagem</h2>
    <div class="grid">
      <label class="f full">Espécie / cultivar do capim<input id="p-capim" data-f="capim" list="dl-capim" value="${esc(d.capim)}" placeholder="Ex.: Brachiaria brizantha cv. Marandu"></label>
      <label class="f">Condição da pastagem<select id="p-cond" data-f="condicao">${opts(CONDICAO,d.condicao)}</select></label>
      <label class="f">Modalidade de aplicação indicada<select id="p-mod" data-f="modalidade">${opts(MODALIDADES,d.modalidade)}</select></label>
    </div>
  </section>

  <section class="card section">
    <div class="row spread"><h2>Plantas daninhas</h2><span class="note">Lista do catálogo, ou digite outro nome</span></div>
    ${(d.daninhas||[]).map((w,i)=>`<div class="weed">
      <label class="f sp">Espécie<input id="w-${i}-n" data-w="${i}" data-k="nome" list="dl-daninhas" value="${esc(w.nome)}" placeholder="Ex.: Assa-peixe-branco"></label>
      <label class="f">Classe<select id="w-${i}-c" data-w="${i}" data-k="classe">${opts(CLASSES,w.classe,"—")}</select></label>
      <label class="f">Estágio<select id="w-${i}-e" data-w="${i}" data-k="estagio">${opts(ESTAGIOS,w.estagio,"—")}</select></label>
      <label class="f">Infestação<select id="w-${i}-i" data-w="${i}" data-k="infestacao">${opts(INFEST,w.infestacao,"—")}</select></label>
      <button class="ghost x" data-a="rm-weed" data-i="${i}" aria-label="Remover espécie">✕</button>
    </div>`).join("")}
    <div><button data-a="add-weed">+ Adicionar espécie</button></div>
  </section>

  <section class="card section">
    <h2>Riscos e manejo</h2>
    <div class="grid">
      <div class="f full"><span>Risco de efeito guarda-chuva</span>${seg("riscoGC",["Baixo","Médio","Alto"],d.riscoGC,"risk")}</div>
      <label class="f full">Comentário sobre o guarda-chuva<input id="p-gcn" data-f="riscoGCNota" value="${esc(d.riscoGCNota)}" placeholder="Ex.: daninhas altas cobrindo as menores no centro do pasto"></label>
      <div class="f full"><span>Recomendação de roçada</span>${seg("rocada",ROCADA,d.rocada)}</div>
      <label class="f full">Justificativa da roçada<input id="p-rcn" data-f="rocadaNota" value="${esc(d.rocadaNota)}" placeholder="Ex.: roçar pragas duras e aplicar na rebrota com 40–60 cm"></label>
    </div>
  </section>

  <section class="card section">
    <div class="row spread"><h2>Fotos</h2><label class="btn file-btn">${S.uploading?`Enviando ${S.uploading}…`:"+ Adicionar fotos"}<input type="file" id="fotos" accept="image/*" multiple ${S.uploading||!assets?"disabled":""}></label></div>
    ${!assets?`<p class="note">O envio de fotos não está disponível nesta visualização. Abra o app logado na sua conta.</p>`:""}
    ${(d.fotos||[]).length?`<div class="photos">${d.fotos.map((f,i)=>`<div class="ph"><img src="${esc(f.url)}" alt="${esc(f.legenda||"Foto do pasto")}" loading="lazy"><input id="f-${i}" data-foto="${i}" value="${esc(f.legenda)}" placeholder="Legenda"><button class="ghost x" data-a="rm-foto" data-i="${i}">Remover</button></div>`).join("")}</div>`:`<p class="note">No celular, o botão abre a câmera ou a galeria. As fotos são reduzidas antes do envio.</p>`}
  </section>

  <section class="card section" id="sec-rec">
    <div class="row spread"><h2>Recomendação</h2><span class="note">Os preços entram uma vez só, na proposta do cliente</span></div>
    ${d.rec.itens.map((r,i)=>{const prods=prodsUso().map(p=>p.nome); const lista=r.produto&&!prods.includes(r.produto)?[r.produto,...prods]:prods; return `<div class="rec">
      <label class="f sp">Produto<select id="r-${i}-p" data-r="${i}" data-k="produto">${opts(lista,r.produto,"Selecione o produto")}</select></label>
      <label class="f">Dose (${esc(r.unidade||"L")}/${d.rec.porBomba?"bomba "+BOMBA+" L":"ha"})<input id="r-${i}-d" class="mono" data-r="${i}" data-k="dose" inputmode="decimal" value="${esc(r.dose)}" placeholder="0,00"></label>
      <div class="cost" id="r-${i}-c">${temPreco(precosDe(d.clienteId))?brl(custoItem(r,precosDe(d.clienteId)))+(d.rec.porBomba?"/bomba":"/ha"):""}</div>
      <button class="ghost x" data-a="rm-rec" data-i="${i}" aria-label="Remover produto">✕</button>
    </div>`}).join("")}
    <div class="row"><button data-a="add-rec">+ Adicionar produto</button>${prodsUso().length?"":`<span class="note">Cadastre os produtos em “Produtos” no topo.</span>`}</div>
    <div class="money" id="rec-tot">${recTotHtml()}</div>
    ${d.rec.porBomba?`<p class="note">Aplicação localizada: doses por bomba de ${BOMBA} litros.</p><label class="f">Bombas de ${BOMBA} L por hectare (estimativa, opcional)<input id="p-bombas" class="mono" data-bombas="1" inputmode="decimal" value="${esc(d.rec.bombasHa??"")}" placeholder="Ex.: 8"></label>`:""}
    ${/drone/i.test(d.modalidade||"")?`<label class="f">Vazão do drone (L/ha)<input id="p-vazao" class="mono" data-vazao="1" inputmode="decimal" value="${esc(d.rec.vazao)}" placeholder="Ex.: 10"></label>`:""}
    <label class="f">Expectativa de controle<input id="p-expect" data-expect="1" value="${esc(d.rec.expectativa)}" placeholder="Ex.: 95% ou “alto nas moles; roço químico nas duras”"></label>
    <label class="f">Observação técnica da recomendação<textarea id="p-recobs" data-recobs="1" placeholder="Ex.: controle nas pragas moles e medianas; roço químico nas pragas duras">${esc(d.rec.obs)}</textarea></label>
  </section>

  <section class="card section">
    <h2>Observações de campo</h2>
    <textarea id="p-obs" data-f="obs" placeholder="Histórico da área, aplicações anteriores, lotação, solo…">${esc(d.obs)}</textarea>
  </section>
  ${isNew?"":`<div><button class="danger ${S.armed==="pasto"?"armed":""}" data-a="excluir-pasto">${S.armed==="pasto"?"Confirmar exclusão do pasto":"Excluir pasto"}</button></div>`}`;
}

function ajustarModo(){
  const d=S.draft; d.rec=d.rec||{itens:[]}; const loc=ehLocal(d.modalidade);
  if(loc&&!d.rec.porBomba){ d.rec.porBomba=true; d.rec.itens.forEach(i=>{ i.unidade=unidBomba(i.unidade); i.dose=""; }); }
  else if(!loc&&d.rec.porBomba){ d.rec.porBomba=false; d.rec.itens.forEach(i=>{ const pp=S.produtos.find(x=>x.nome===i.produto); i.unidade=pp?.unidade||"L"; i.dose=""; }); }
}
function recTotHtml(){
  const d=S.draft; const ha=areaNum(d.areaHa)||0; const pr=precosDe(d.clienteId); const c=recCusto(d.rec,pr);
  if(d.rec?.porBomba&&temPreco(pr)){ const cb=custoBomba(d.rec,pr), nb=dec(d.rec.bombasHa);
    return `<div><b>${brl(cb)}</b><span>custo por bomba de ${BOMBA} L</span></div>`+(nb?`<div><b>${brl(cb*nb)}</b><span>custo por hectare (${fmtDose(nb)} bombas/ha)</span></div><div><b>${brl(cb*nb*ha)}</b><span>total do pasto (${fmtHa(ha)} ha)</span></div>`:`<div><span>Informe as bombas por hectare para calcular o custo por hectare e do pasto.</span></div>`); }
  if(!temPreco(pr)) return `<div><b>${fmtHa(ha)}</b><span>hectares</span></div><div><span>Custos aparecem depois que você informar os preços na proposta do cliente.</span></div>`;
  return `<div><b>${brl(c)}</b><span>custo por hectare</span></div><div><b>${fmtHa(ha)}</b><span>hectares</span></div><div><b>${brl(c*ha)}</b><span>total do pasto</span></div>`;
}
function updRec(){ const d=S.draft; d.rec.itens.forEach((r,i)=>{ const el=document.getElementById(`r-${i}-c`); if(el&&temPreco(precosDe(d.clienteId))) el.textContent=brl(custoItem(r,precosDe(d.clienteId)))+(d.rec.porBomba?"/bomba":"/ha"); }); const t=document.getElementById("rec-tot"); if(t) t.innerHTML=recTotHtml(); }

/* ---------- biblioteca de áreas ---------- */
const chaveArea = a => (a.nome||"").trim().toLowerCase()+"|"+(+a.areaHa||0).toFixed(2);
function bibOrdenada(cid){ return S.biblio.slice().sort((a,b)=>((b.clienteId===cid)-(a.clienteId===cid))||(b.criadoEm||"").localeCompare(a.criadoEm||"")); }
function vPicker(d){
  const q=S.qp.trim().toLowerCase(); const ja=new Set((d.areas||[]).map(chaveArea));
  const lista=bibOrdenada(d.clienteId).filter(a=>!q||[a.nome,a.descricao,a.fazenda,cliente(a.clienteId)?.nome].join(" ").toLowerCase().includes(q));
  return `<div class="inline"><input type="search" id="qp" placeholder="Buscar área por nome, descrição ou fazenda" value="${esc(S.qp)}" aria-label="Buscar área">
    <div>${lista.length?lista.slice(0,60).map(a=>{const tem=ja.has(chaveArea(a));return `<div class="pick"><div><b>${esc(a.nome)}</b><span>${fmtHa(a.areaHa)} ha${a.descricao?" · "+esc(a.descricao):""}${a.clienteId?" · "+esc(cliente(a.clienteId)?.nome||""):""}${a.fazenda?" · "+esc(a.fazenda):""}</span></div>
      <button data-a="usar-area" data-id="${a.id}" ${tem?"disabled":""}>${tem?"Já no pasto":"Adicionar"}</button></div>`}).join(""):`<p class="note">${S.biblio.length?"Nenhuma área encontrada.":"A biblioteca está vazia. Importe KMLs em “Áreas” no topo."}</p>`}</div></div>`;
}
function vAreas(){
  const q=S.qa.trim().toLowerCase();
  const lista=S.biblio.slice().sort((a,b)=>(b.criadoEm||"").localeCompare(a.criadoEm||"")).filter(a=>!q||[a.nome,a.descricao,a.fazenda,cliente(a.clienteId)?.nome].join(" ").toLowerCase().includes(q));
  const cls=S.clientes.slice().sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt"));
  return `
  <div><button class="crumb" data-a="voltar-lista">← Clientes</button></div>
  <div class="row spread"><div><div class="eyebrow">Biblioteca</div><h1>Áreas (KML)</h1></div>
    <label class="btn file-btn primary" style="background:var(--accent);color:var(--accent-ink);border-color:var(--accent)">Importar KML/KMZ<input type="file" id="kml-lib" multiple></label></div>
  <p class="note">Todo KML importado fica guardado aqui. No pasto, use “Escolher da biblioteca de áreas” para trazer a área com mapa e hectares.</p>
  ${S.biblio.length?`<div class="row"><button class="danger ${S.armed==="bib-todas"?"armed":""}" data-a="apagar-biblioteca" ${S.busy?"disabled":""}>${S.busy==="bib"?"Apagando…":S.armed==="bib-todas"?`Confirmar: apagar as ${S.biblio.length} áreas`:`Apagar todas as áreas da biblioteca (${S.biblio.length})`}</button>${S.armed==="bib-todas"?`<span class="note">Os pastos não são afetados: as áreas já colocadas em pastos continuam neles.</span>`:""}</div>`:""}
  ${S.biblio.length>4?`<input type="search" id="qa" placeholder="Buscar por nome, descrição, cliente ou fazenda" value="${esc(S.qa)}" aria-label="Buscar área">`:""}
  <div class="list">${lista.length?lista.map(a=>`<div class="card lib">${polySvg([a.poligono])}<div class="body">
    <div class="hd"><b>${esc(a.nome)}</b><span>${fmtHa(a.areaHa)} ha</span></div>
    <div class="g">
      <label class="f">Nome<input id="ba-${a.id}-n" data-bib="${a.id}" data-k="nome" value="${esc(a.nome)}"></label>
      <label class="f">Cliente<select id="ba-${a.id}-c" data-bib="${a.id}" data-k="clienteId"><option value="">Sem cliente</option>${cls.map(c=>`<option value="${c.id}" ${c.id===a.clienteId?"selected":""}>${esc(c.nome)}</option>`).join("")}</select></label>
      <label class="f">Fazenda<input id="ba-${a.id}-f" data-bib="${a.id}" data-k="fazenda" value="${esc(a.fazenda)}"></label>
      <label class="f" style="grid-column:1/-1">Descrição<input id="ba-${a.id}-d" data-bib="${a.id}" data-k="descricao" value="${esc(a.descricao)}"></label>
    </div>
    <div class="row"><span class="note">${esc(a.arquivo||"")}${a.criadoEm?" · importado em "+fmtDate(a.criadoEm.slice(0,10)):""}</span><button class="danger ${S.armed==="bib-"+a.id?"armed":""}" data-a="excluir-area" data-id="${a.id}" style="min-height:34px;padding:4px 10px;font-size:13px;margin-left:auto">${S.armed==="bib-"+a.id?"Confirmar exclusão":"Excluir"}</button></div>
  </div></div>`).join(""):`<div class="card empty"><b>${q?"Nenhuma área encontrada":"Nenhuma área guardada"}</b>${q?"Tente outro termo.":"Importe os KMLs exportados do Field Area Measure."}</div>`}</div>`;
}
async function guardarNaBiblioteca(itens, extra={}){
  const ja=new Set(S.biblio.map(chaveArea)); let n=0; const now=new Date().toISOString();
  for(const i of itens){ if(ja.has(chaveArea(i))) continue; ja.add(chaveArea(i));
    try{ await db.collection("areas").doc().set({nome:i.nome,descricao:i.descricao||"",poligono:i.poligono,areaHa:i.areaHa,arquivo:i.arquivo||"",clienteId:extra.clienteId||"",fazenda:extra.fazenda||"",criadoEm:now}); n++; }catch(e){} }
  return n;
}

/* ---------- produtos e ajustes ---------- */
function vAjustes(){
  const d=S.draft, c=d.config;
  return `
  <div><button class="crumb" data-a="voltar-lista">← Clientes</button></div>
  ${S.view.aba==="dados"?vDados(c):S.view.aba==="novoprod"?vNovoProduto():vProdutos()}`;
}
function prodsUso(){ return S.produtos.filter(p=>!p.status||p.status==="aprovado"); }
function vProdutos(){
  const st={pendente:"Aguardando aprovação",rejeitado:"Rejeitado"};
  const lista=[...S.produtos].sort((a,b)=>(a.status==="pendente"?0:1)-(b.status==="pendente"?0:1)||(a.nome||"").localeCompare(b.nome||"","pt"));
  return `<div><div class="eyebrow">Ajustes</div><h1>Produtos</h1></div>
  <section class="card section">
    <div class="row spread"><h2>Lista de produtos</h2><span class="note">Usada nas recomendações. Os preços entram na proposta de cada cliente.</span></div>
    <div class="row"><button class="primary" data-a="novo-produto">+ Novo produto</button></div>
    <div class="prod-lista">${lista.map(p=>`<div class="prod-ro${p.status&&p.status!=="aprovado"?" st-"+esc(p.status):""}">
      <div class="row spread"><b>${esc(p.nome)}</b>${st[p.status]?`<span class="pill st-${esc(p.status)}">${st[p.status]}</span>`:""}</div>
      <div class="note">${[p.tipo,p.industria,window.principiosTexto?window.principiosTexto(p.principios):"",p.formulacao&&window.formulacaoTexto?window.formulacaoTexto(p.formulacao):"",p.volume?"Vendido em "+p.volume:"","Dose em "+(p.unidade||"L")+"/ha"].filter(Boolean).map(esc).join(" · ")}</div>
      ${p.status==="rejeitado"&&p.motivo?`<div class="note">Motivo: ${esc(p.motivo)}</div>`:""}
    </div>`).join("")||`<p class="note">Nenhum produto ainda.</p>`}</div>
    <p class="note">Produtos novos só entram nas recomendações depois de aprovados pelo administrador.</p>
  </section>`;
}
function vNovoProduto(){
  return `<div><div class="eyebrow">Produtos</div><h1>Novo produto</h1></div>
  <section class="card section" id="novoProdForm">
    <p class="note">${window.__souAdmin?"Como dono, o produto entra já aprovado.":"O produto fica aguardando a aprovação do administrador antes de aparecer nas recomendações."}</p>
    ${window.produtoFormHTML?window.produtoFormHTML({}):""}
    <div class="row"><button class="primary" data-a="enviar-produto" ${S.busy?"disabled":""}>${S.busy?"Enviando…":window.__souAdmin?"Salvar produto":"Enviar para aprovação"}</button><button class="ghost" data-a="abrir-ajustes">Cancelar</button></div>
  </section>`;
}
function vDados(c){
  return `<div><div class="eyebrow">Ajustes</div><h1>Dados</h1></div>
  ${window.__contaHTML?window.__contaHTML():""}
  <section class="card section">
    <h2>Dados padrão do relatório</h2>
    <p class="note" style="margin-top:-4px">Preenchem automaticamente cada novo cliente. Para mudar só um cliente, edite no cadastro dele.</p>
    <div class="grid">
      <label class="f">Distribuidor<input id="cf-emp" data-cf="empresa" value="${esc(c.empresa)}"></label>
      <label class="f">Responsável técnico<input id="cf-resp" data-cf="responsavel" value="${esc(c.responsavel)}" placeholder="Seu nome"></label>
      <label class="f">Telefone<input id="cf-tel" data-cf="telefone" value="${esc(c.telefone)}" inputmode="tel"></label>
      <label class="f">E-mail<input id="cf-mail" data-cf="email" value="${esc(c.email)}" inputmode="email"></label>
    </div>
    <div class="logo-emp">
      <b>Logo da empresa</b>
      <p class="note">Aparece no canto superior direito do PDF, no lugar do nome do distribuidor. Sem logo, o PDF mostra o nome escrito.</p>
      ${c.logo?`<div class="logo-prev"><img src="${c.logo}" alt="Logo da empresa"></div>`:""}
      <div class="row"><label class="btn file-btn">${c.logo?"Trocar logo":"Enviar logo"}<input type="file" id="logo-emp" accept="image/png,image/jpeg,image/webp"></label>${c.logo?`<button class="ghost" data-a="rm-logo">Remover logo</button>`:""}</div>
    </div>
  </section>
  <section class="card section">
    <h2>Backup dos dados</h2>
    <p class="note">${window.__nuvem?"Seus dados ficam no aparelho e são copiados para a nuvem sempre que há internet. O backup é uma cópia extra, em arquivo.":"Nesta versão offline os dados ficam guardados só neste aparelho e navegador. Exporte um backup com frequência: ele serve para não perder nada e para passar os dados para outro aparelho."}</p>
    <div class="row"><button class="primary" data-a="exportar-backup">Exportar backup</button><label class="btn file-btn">Importar backup<input type="file" id="bk-imp" accept=".json,application/json"></label></div>
  </section>`;
}
async function salvarAjustes(){
  const d=S.draft; S.busy=true; bar(); let ok=true;
  try{
    const cf={empresa:d.config.empresa||"",responsavel:d.config.responsavel||"",registro:d.config.registro||"",telefone:d.config.telefone||"",email:d.config.email||"",logo:d.config.logo||"",logoW:d.config.logoW||0,logoH:d.config.logoH||0};
    if(JSON.stringify(cf)!==JSON.stringify({empresa:S.config.empresa||"",responsavel:S.config.responsavel||"",registro:S.config.registro||"",telefone:S.config.telefone||"",email:S.config.email||"",logo:S.config.logo||"",logoW:S.config.logoW||0,logoH:S.config.logoH||0})) { await db.doc("config/geral").set(cf); S.config=cf; }
    d.removidos=[]; S.dirty=false; toast("Ajustes salvos");
  }catch(e){ ok=false; toast("Não foi possível salvar. Verifique a internet e tente de novo."); }
  S.busy=false; render(); return ok;
}

/* ---------- proposta ---------- */
function propPastos(cid){ const ex=new Set(S.draft?.excluir||[]); return pastosDe(cid).map(p=>({p,inc:temRec(p)&&!ex.has(p.id)})); }
function resumo(lista,pr){
  const prods={}; let total=0, ha=0;
  lista.forEach(p=>{ const a=+p.areaHa||0; ha+=a; total+=recCusto(p.rec,pr)*a;
    (p.rec?.itens||[]).filter(i=>i.produto&&dec(i.dose)).forEach(i=>{ const u=i.unidade||"L"; const k=i.produto+"|"+uCompra(u); const o=prods[k]||(prods[k]={produto:i.produto,unidade:uCompra(u),preco:dec(pr?.[i.produto])||0,volume:0}); o.volume+=doseHa(i,p.rec)*fator(u)*a; }); });
  const itens=Object.values(prods).sort((a,b)=>a.produto.localeCompare(b.produto,"pt"));
  return {itens,total,ha,medio:ha?total/ha:0};
}
function vProposta(){
  const c=cliente(S.view.id)||{}, d=S.draft, rows=propPastos(S.view.id);
  const inc=rows.filter(r=>r.inc).map(r=>r.p); const pr=d.precos; const rs=resumo(inc,pr);
  const semRec=rows.filter(r=>!temRec(r.p)).length;
  return `
  <div><button class="crumb" data-a="voltar-cliente-prop">← ${esc(c.nome||"Cliente")}</button></div>
  <div><div class="eyebrow">Proposta</div><h1>Recomendação técnica e proposta comercial</h1></div>
  <div class="money"><div><b>${inc.length}</b><span>pastos incluídos</span></div><div><b>${fmtHa(rs.ha)}</b><span>hectares</span></div><div><b>${brl(rs.medio)}</b><span>custo médio por ha</span></div><div><b>${brl(rs.total)}</b><span>investimento total</span></div><div><b>${volTot(rs.itens)}</b><span>volume total de produtos</span></div></div>
  ${rs.itens.length?`<section class="card section"><div class="row spread"><h2>Preços e volumes</h2><span class="note">Informe o preço de cada produto uma vez; vale para todos os pastos</span></div><div class="plist">${rs.itens.map((i,k)=>`<div class="prow"><div class="pn"><b>${esc(i.produto)}</b><span class="mono">${fmtN(i.volume,1)} ${esc(i.unidade)}</span></div>
      <label class="pz"><span>R$</span><input id="pz-${k}" class="mono" data-preco="${esc(i.produto)}" inputmode="decimal" value="${esc(pr[i.produto]??"")}" placeholder="0,00" aria-label="Preço de ${esc(i.produto)} por ${esc(i.unidade)}"><span>/${esc(i.unidade)}</span></label>
      <span class="pt mono">${brl(i.volume*i.preco)}</span></div>`).join("")}
    <div class="prow tot"><div class="pn"><b>Total</b><span class="mono">${volTot(rs.itens)}</span></div><span></span><span class="pt mono">${brl(rs.total)}</span></div></div>
  ${(()=>{const sp=rs.itens.filter(i=>!i.preco&&!/óleo|redutor/i.test(i.produto)).map(i=>i.produto);return sp.length?`<p class="chip warn" style="align-self:flex-start">Sem preço: ${esc(sp.join(", "))}</p>`:""})()}</section>`:""}
  <section class="card section">
    <div class="grid">
      <label class="f">Safra<input id="pp-safra" data-pp="safra" value="${esc(d.safra)}"></label>
      <label class="f">Data do relatório<input id="pp-data" type="date" data-pp="data" value="${esc(d.data)}"></label>
      <label class="f">Validade da proposta<input id="pp-val" data-pp="validade" value="${esc(d.validade)}"></label>
      <label class="f">Condição de pagamento<input id="pp-pag" data-pp="pagamento" value="${esc(d.pagamento)}" placeholder="Ex.: 30/60/90 dias, safra"></label>
      <label class="f full">Considerações técnicas gerais<textarea id="pp-tec" data-pp="obsTec" placeholder="Aparece no início da recomendação técnica">${esc(d.obsTec)}</textarea></label>
      <label class="f full">Observações comerciais<textarea id="pp-com" data-pp="obsCom" placeholder="Frete, entrega, condições especiais">${esc(d.obsCom)}</textarea></label>
    </div>
  </section>
  <section class="card section">
    <div class="row spread"><h2>Pastos no relatório</h2>${semRec?`<span class="chip warn">${semRec} sem recomendação</span>`:""}</div>
    <div class="tbl"><table><thead><tr><th></th><th>Fazenda / pasto</th><th class="r">Área (ha)</th><th class="r">R$/ha</th><th class="r">Total</th></tr></thead><tbody>
    ${rows.map(({p,inc})=>`<tr><td><input type="checkbox" data-inc="${p.id}" aria-label="Incluir ${esc(p.nome)}" ${inc?"checked":""} ${temRec(p)?"":"disabled"}></td>
      <td><button class="crumb" data-a="abrir-pasto" data-id="${p.id}" style="text-align:left;min-height:0">${esc(p.fazenda?p.fazenda+" · ":"")}${esc(p.nome)}</button>${temRec(p)?"":`<div class="note">Sem recomendação. Abra o pasto para preencher.</div>`}</td>
      <td class="r">${fmtHa(p.areaHa)}</td><td class="r">${temRec(p)?custoHaTxt(p.rec,pr):"—"}</td><td class="r">${temRec(p)&&!semEstimativa(p.rec)?brl(recCusto(p.rec,pr)*(+p.areaHa||0)):"—"}</td></tr>`).join("")}
    </tbody><tfoot><tr><td></td><td>Total</td><td class="r">${fmtHa(rs.ha)}</td><td class="r">${brl(rs.medio)}</td><td class="r">${brl(rs.total)}</td></tr></tfoot></table></div>
  </section>
  ${relDe(cliente(S.view.id)).responsavel?"":`<p class="note">Dica: preencha o responsável técnico em “Dados que aparecem no relatório”, no cadastro do cliente, para ele sair na assinatura do PDF.</p>`}`;
}
async function salvarProposta(silent){
  const d=S.draft; const ref=db.collection("clientes").doc(S.view.id);
  try{ await ref.update({proposta:{precos:Object.fromEntries(Object.entries(d.precos||{}).map(([k,v])=>[k,dec(v)]).filter(([k,v])=>v!=null)),safra:d.safra||"",data:d.data||"",validade:d.validade||"",pagamento:d.pagamento||"",obsTec:d.obsTec||"",obsCom:d.obsCom||"",excluir:d.excluir||[]}}); S.dirty=false; if(!silent) toast("Proposta salva"); bar(); return true; }
  catch(e){ toast("Não foi possível salvar a proposta."); return false; }
}

function bar(){
  const slot=document.getElementById("barSlot");
  if(S.pending){
    slot.innerHTML=`<div class="bar"><div class="bar-in"><span class="msg">Há alterações não salvas.</span><button data-a="descartar">Descartar</button><button class="primary" data-a="salvar-e-sair">Salvar</button></div></div>`; return;
  }
  if(S.view.name==="ajustes"&&S.view.aba==="dados"){
    slot.innerHTML=`<div class="bar"><div class="bar-in"><span class="msg">${S.dirty?"Alterações não salvas":"Tudo salvo"}</span><button class="primary" data-a="salvar-ajustes" ${S.busy?"disabled":""}>${S.busy?"Salvando…":"Salvar"}</button></div></div>`; return;
  }
  if(S.view.name==="proposta"){
    slot.innerHTML=`<div class="bar"><div class="bar-in"><span class="msg">${S.gerando?esc(S.gerando):S.dirty?"Alterações não salvas":"Proposta salva"}</span><button data-a="salvar-proposta" ${S.dirty?"":"disabled"}>Salvar</button><button class="primary" data-a="gerar-pdf" ${S.gerando?"disabled":""}>${S.gerando?"Gerando…":"Gerar PDF"}</button></div></div>`; return;
  }
  if(S.view.name==="pasto"){
    slot.innerHTML=`<div class="bar"><div class="bar-in"><span class="msg">${S.dirty?"Alterações não salvas":"Tudo salvo"}</span><button class="primary" data-a="salvar-pasto" ${S.busy||S.uploading?"disabled":""}>${S.busy?"Salvando…":"Salvar pasto"}</button></div></div>`; return;
  }
  slot.innerHTML="";
}

function render(){
  const ae=document.activeElement, fid=ae&&ae.id, sel=fid&&ae.selectionStart!=null?[ae.selectionStart,ae.selectionEnd]:null;
  $app.innerHTML = S.view.name==="cliente"?vCliente():S.view.name==="pasto"?vPasto():S.view.name==="ajustes"?vAjustes():S.view.name==="areas"?vAreas():S.view.name==="proposta"?vProposta():vLista();
  bar();
  if(fid){ const el=document.getElementById(fid); if(el){ el.focus({preventScroll:true}); if(sel&&el.setSelectionRange) try{el.setSelectionRange(...sel)}catch(e){} } }
}

/* ---------- events ---------- */
document.addEventListener("input", e=>{
  const t=e.target;
  if(t.id==="q"){ S.q=t.value; render(); return; }
  if(t.id==="qa"){ S.qa=t.value; render(); return; }
  if(t.id==="qp"){ S.qp=t.value; render(); return; }
  if(t.dataset.bib) return;
  if(t.id==="imp-faz"&&S.importing){ S.importing.fazenda=t.value; return; }
  if(t.id==="imp-nome"&&S.importing){ S.importing.nome=t.value; return; }
  if(!S.draft) return;
  if(t.dataset.f){ S.draft[t.dataset.f]=t.dataset.f==="uf"?t.value.toUpperCase():t.value; S.dirty=true; bar(); if(t.dataset.f==="areaHa") updRec(); if(t.dataset.f==="modalidade"){ ajustarModo(); render(); } }
  else if(t.dataset.r!=null){ const r=S.draft.rec.itens[+t.dataset.r]; r[t.dataset.k]=t.value;
    if(t.dataset.k==="produto"){ const p=S.produtos.find(x=>x.nome===t.value); if(p){ r.unidade=S.draft.rec.porBomba?unidBomba(p.unidade||"L"):(p.unidade||"L"); r.produtoId=p.id; } S.dirty=true; render(); return; }
    S.dirty=true; updRec(); bar(); }
  else if(t.dataset.bombas){ S.draft.rec.bombasHa=t.value; S.dirty=true; updRec(); bar(); }
  else if(t.dataset.vazao){ S.draft.rec.vazao=t.value; S.dirty=true; bar(); }
  else if(t.dataset.expect){ S.draft.rec.expectativa=t.value; S.dirty=true; bar(); }
  else if(t.dataset.recobs){ S.draft.rec.obs=t.value; S.dirty=true; bar(); }
  else if(t.dataset.pr!=null){ S.draft.produtos[+t.dataset.pr][t.dataset.k]=t.value; S.dirty=true; if(t.dataset.k==="unidade") render(); else bar(); }
  else if(t.dataset.rel){ S.draft.rel[t.dataset.rel]=t.value; S.dirty=true; bar(); }
  else if(t.dataset.cf){ S.draft.config[t.dataset.cf]=t.value; S.dirty=true; bar(); }
  else if(t.dataset.preco!=null){ S.draft.precos[t.dataset.preco]=t.value; S.dirty=true; render(); }
  else if(t.dataset.pp){ S.draft[t.dataset.pp]=t.value; S.dirty=true; bar(); }
  else if(t.dataset.w!=null){ S.draft.daninhas[+t.dataset.w][t.dataset.k]=t.value; S.dirty=true; bar(); }
  else if(t.dataset.area!=null){ S.draft.areas[+t.dataset.area].nome=t.value; S.dirty=true; bar(); }
  else if(t.dataset.foto!=null){ S.draft.fotos[+t.dataset.foto].legenda=t.value; S.dirty=true; bar(); }
});
document.addEventListener("change", async e=>{
  const t=e.target;
  if(t.tagName==="SELECT"&&!t.dataset.bib) return; // tratado em input
  if(t.id==="logo-emp"){
    const f=t.files[0]; t.value=""; if(!f) return;
    try{
      const bmp=await createImageBitmap(f); const max=600, sc=Math.min(1,max/bmp.width,240/bmp.height);
      const cv=document.createElement("canvas"); cv.width=Math.max(1,Math.round(bmp.width*sc)); cv.height=Math.max(1,Math.round(bmp.height*sc));
      cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);
      Object.assign(S.draft.config,{logo:cv.toDataURL("image/png"),logoW:cv.width,logoH:cv.height}); S.dirty=true; render(); toast("Logo carregada. Toque em Salvar.");
    }catch(err){ toast("Não consegui ler essa imagem. Use PNG ou JPG."); }
    return; }
  if(t.dataset.inc&&S.draft){ const ex=new Set(S.draft.excluir); t.checked?ex.delete(t.dataset.inc):ex.add(t.dataset.inc); S.draft.excluir=[...ex]; S.dirty=true; render(); return; }
  if(t.id==="bk-imp"){ const f=t.files[0]; t.value=""; if(!f) return;
    try{ const j=JSON.parse(await f.text()); if(!j||!j.dados) throw new Error("Arquivo não é um backup do app.");
      const n=await window.__localdb._importar(j.dados); toast(`Backup importado: ${n} registros`); }catch(err){ toast(err.message||"Não foi possível importar o backup."); } return; }
  if(t.dataset.bib){ const a=S.biblio.find(x=>x.id===t.dataset.bib); if(a&&a[t.dataset.k]!==t.value){ try{ await db.collection("areas").doc(a.id).update({[t.dataset.k]:t.value}); toast("Área atualizada"); }catch(e){ toast("Não foi possível salvar a alteração."); } } return; }
  if(t.id==="kml-cli"||t.id==="kml-pasto"||t.id==="kml-lib"){
    const files=[...t.files]; t.value=""; if(!files.length) return;
    try{
      let itens=[]; for(const f of files){ (await readGeoFile(f)).forEach(i=>itens.push({...i,arquivo:f.name})); }
      if(t.id==="kml-lib"){ const n=await guardarNaBiblioteca(itens); toast(n?`${n} área${n===1?"":"s"} guardada${n===1?"":"s"} na biblioteca`:"Essas áreas já estavam na biblioteca"); return; }
      guardarNaBiblioteca(itens, t.id==="kml-pasto"?{clienteId:S.draft.clienteId,fazenda:S.draft.fazenda||""}:{clienteId:S.view.id});
      if(t.id==="kml-cli"){ S.importing={itens,fazenda:"",nome:"",modo:"separado"}; render(); }
      else{ itens.forEach(i=>S.draft.areas.push({nome:i.nome,poligono:i.poligono,areaHa:i.areaHa,kml:i.arquivo})); somaAreas(); if(!S.draft.nome) S.draft.nome=itens[0].nome; S.dirty=true; render(); toast(itens.length>1?`${itens.length} áreas adicionadas (${fmtHa(itens.reduce((s,i)=>s+i.areaHa,0))} ha)`:`Área adicionada: ${fmtHa(itens[0].areaHa)} ha`); }
    }catch(err){ toast(err.message||"Não consegui ler o arquivo."); }
  }
  if(t.id==="fotos"){
    const files=[...t.files]; t.value=""; if(!files.length||!assets) return;
    let n=0; for(const f of files){ n++; S.uploading=`${n}/${files.length}`; render();
      try{ const blob=await shrink(f); const r=await assets.upload(blob); S.draft.fotos.push({id:r.id,url:r.url,legenda:""}); S.dirty=true; }
      catch(err){ toast(`Foto ${n} não foi enviada: ${err?.message||"erro"}`); } }
    S.uploading=null; render();
  }
});
document.addEventListener("click", async e=>{
  const sb=e.target.closest("[data-seg]");
  if(sb&&S.draft){ const f=sb.dataset.seg,v=sb.dataset.v; S.draft[f]=S.draft[f]===v?"":v; S.dirty=true; render(); return; }
  const b=e.target.closest("[data-a]"); if(!b) return;
  const a=b.dataset.a;
  if(a!=="excluir-cliente"&&a!=="excluir-pasto"&&a!=="excluir-area"&&a!=="apagar-biblioteca") S.armed=null;
  switch(a){
    case "novo-cliente": go({name:"cliente"}); break;
    case "abrir-cliente": go({name:"cliente",id:b.dataset.id}); break;
    case "voltar-lista": go({name:"lista"}); break;
    case "abrir-ajustes": go({name:"ajustes",aba:"produtos"}); break;
    case "abrir-dados": go({name:"ajustes",aba:"dados"}); break;
    case "rm-logo": Object.assign(S.draft.config,{logo:"",logoW:0,logoH:0}); S.dirty=true; render(); break;
    case "novo-produto": go({name:"ajustes",aba:"novoprod"}); break;
    case "enviar-produto": {
      const form=document.querySelector("#novoProdForm .prod-form"); if(!form) break;
      const p=window.produtoFormLer(form); const erro=window.produtoFormValidar(p); if(erro){ toast(erro); break; }
      if(S.produtos.some(x=>(x.nome||"").trim().toLowerCase()===p.nome.toLowerCase())){ toast("Já existe um produto com esse nome."); break; }
      S.busy=true; render(); const vals=p;
      try{
        if(window.__enviarProduto) await window.__enviarProduto(vals);
        else await db.collection("produtos").doc(window.produtoId(vals.nome)).set({...vals,status:"aprovado"});
        S.busy=false; toast(window.__souAdmin||!window.__enviarProduto?"Produto salvo.":"Produto enviado para aprovação."); go({name:"ajustes",aba:"produtos"});
      }catch(e){ S.busy=false; render(); const f=document.querySelector("#novoProdForm .prod-form"); if(f){ /* refaz o formulário com o que foi digitado */ f.outerHTML=window.produtoFormHTML(vals); } toast(e&&e.message||"Não foi possível enviar. Verifique a internet."); }
      break; }
    case "exportar-backup": { try{ const dados=await window.__localdb._tudo(); const n=Object.values(dados).reduce((s,c)=>s+Object.keys(c).length,0);
        await downloads.save({filename:`backup-pasto-limpo-${today()}.json`,data:new Blob([JSON.stringify({app:"proposta-pasto-limpo",versao:1,exportadoEm:new Date().toISOString(),dados})],{type:"application/json"})}); toast(`Backup exportado (${n} registros)`); }catch(e){ toast("Não foi possível exportar o backup."); } break; }
    case "abrir-areas": go({name:"areas"}); break;
    case "toggle-picker": S.picker=!S.picker; S.qp=""; render(); break;
    case "usar-area": { const a=S.biblio.find(x=>x.id===b.dataset.id); if(a){ S.draft.areas.push({nome:a.nome,poligono:a.poligono,areaHa:a.areaHa,kml:a.arquivo||""}); somaAreas(); if(!S.draft.nome) S.draft.nome=a.nome; S.dirty=true; render(); toast(`${a.nome} adicionada: ${fmtHa(a.areaHa)} ha`); } break; }
    case "apagar-biblioteca": {
      if(S.armed!=="bib-todas"){ S.armed="bib-todas"; render(); break; }
      S.armed=null; S.busy="bib"; render(); const ids=S.biblio.map(x=>x.id); let n=0;
      try{ for(const id of ids){ await db.collection("areas").doc(id).delete(); n++; } toast(`${n} área${n===1?"":"s"} apagada${n===1?"":"s"} da biblioteca`); }
      catch(e){ toast(`Apaguei ${n} de ${ids.length}. Tente de novo para terminar.`); }
      S.busy=false; render(); break; }
    case "excluir-area": if(S.armed!=="bib-"+b.dataset.id){ S.armed="bib-"+b.dataset.id; render(); break; } S.armed=null; await remove(db.collection("areas").doc(b.dataset.id),"Área excluída"); break;
    case "abrir-proposta": go({name:"proposta",id:b.dataset.id}); break;
    case "voltar-cliente-prop": go({name:"cliente",id:S.view.id}); break;
    case "add-rec": S.draft.rec.itens.push({produto:"",dose:"",unidade:S.draft.rec.porBomba?"mL":"L"}); S.dirty=true; render(); document.getElementById(`r-${S.draft.rec.itens.length-1}-p`)?.focus(); break;
    case "rm-rec": S.draft.rec.itens.splice(+b.dataset.i,1); S.dirty=true; render(); break;
    case "add-prod": S.draft.produtos.push({nome:"",tipo:"Herbicida",unidade:"L"}); S.dirty=true; render(); document.getElementById(`pr-${S.draft.produtos.length-1}-n`)?.focus(); break;
    case "rm-prod": { const [p]=S.draft.produtos.splice(+b.dataset.i,1); if(p?.id) S.draft.removidos.push(p.id); S.dirty=true; render(); break; }
    case "salvar-ajustes": await salvarAjustes(); break;
    case "salvar-proposta": await salvarProposta(); break;
    case "gerar-pdf": await gerarPdf(); break;
    case "voltar-cliente": go({name:"cliente",id:S.draft.clienteId}); break;
    case "novo-pasto": go({name:"pasto",clienteId:S.view.id}); break;
    case "abrir-pasto": go({name:"pasto",id:b.dataset.id}); break;
    case "salvar-cliente": await salvarCliente(); break;
    case "salvar-pasto": await salvarPasto(); break;
    case "salvar-e-sair": { const nxt=S.pending; S.pending=null; const ok=S.view.name==="pasto"?await salvarPasto():S.view.name==="ajustes"?await salvarAjustes():S.view.name==="proposta"?await salvarProposta():await salvarCliente(); if(ok) go({...nxt,force:true}); break; }
    case "descartar": go({...S.pending,force:true}); break;
    case "add-weed": S.draft.daninhas.push({nome:"",classe:"",estagio:"",infestacao:""}); S.dirty=true; render(); document.getElementById(`w-${S.draft.daninhas.length-1}-n`)?.focus(); break;
    case "rm-weed": S.draft.daninhas.splice(+b.dataset.i,1); S.dirty=true; render(); break;
    case "rm-foto": S.draft.fotos.splice(+b.dataset.i,1); S.dirty=true; render(); break;
    case "rm-area": S.draft.areas.splice(+b.dataset.i,1); somaAreas(); S.dirty=true; render(); break;
    case "modo-import": S.importing.modo=b.dataset.v; render(); break;
    case "cancelar-import": S.importing=null; render(); break;
    case "confirmar-import": await confirmarImport(); break;
    case "excluir-cliente":
      if(S.armed!=="cli"){ S.armed="cli"; render(); break; }
      { const id=S.view.id; for(const p of pastosDe(id)) await db.collection("pastos").doc(p.id).delete().catch(()=>{});
        if(await remove(db.collection("clientes").doc(id),"Cliente excluído")) go({name:"lista",force:true}); } break;
    case "excluir-pasto":
      if(S.armed!=="pasto"){ S.armed="pasto"; render(); break; }
      { const cid=S.draft.clienteId; if(await remove(db.collection("pastos").doc(S.view.id),"Pasto excluído")) go({name:"cliente",id:cid,force:true}); } break;
  }
  if(a!=="excluir-cliente"&&a!=="excluir-pasto"&&S.armed===null) {}
});

async function salvarCliente(){
  const d=S.draft; if(!d.nome.trim()){ toast("Informe o nome do cliente."); document.getElementById("c-nome")?.focus(); return false; }
  const now=new Date().toISOString();
  const data={nome:d.nome.trim(),municipio:(d.municipio||"").trim(),uf:(d.uf||"").trim().toUpperCase(),contato:d.contato||"",telefone:d.telefone||"",obs:d.obs||"",criadoEm:d.criadoEm||now,atualizadoEm:now};
  const rel=d.rel||relDe(null); data.rel={empresa:(rel.empresa||"").trim(),responsavel:(rel.responsavel||"").trim(),telefone:(rel.telefone||"").trim(),email:(rel.email||"").trim()};
  const atual=S.view.id?cliente(S.view.id):null; if(atual?.proposta) data.proposta=atual.proposta;
  const ref=S.view.id?db.collection("clientes").doc(S.view.id):db.collection("clientes").doc();
  const ok=await write(ref,data,S.view.id?"Cliente salvo":"Cliente criado");
  if(ok && JSON.stringify(data.rel)!==JSON.stringify(relDe({rel:S.config}))){ try{ await db.doc("config/geral").set({...S.config,...data.rel}); S.config={...S.config,...data.rel}; }catch(e){} }
  if(ok){ S.dirty=false; if(!S.view.id){ S.view={name:"cliente",id:ref.id}; S.draft={...data,id:ref.id}; } render(); }
  return ok;
}
function num(v){ if(v===""||v==null) return null; const n=parseFloat(String(v).replace(/\./g,"").replace(",",".")); return isFinite(n)?n:null; }
function areaNum(v){ if(typeof v==="number") return v; const s=String(v||"").trim(); if(!s) return null; return s.includes(",")?num(s):(isFinite(+s)?+s:null); }
async function salvarPasto(){
  const d=S.draft; if(!String(d.nome||"").trim()){ toast("Informe o nome do pasto."); document.getElementById("p-nome")?.focus(); return false; }
  const now=new Date().toISOString();
  const data={clienteId:d.clienteId,fazenda:(d.fazenda||"").trim(),nome:d.nome.trim(),areaHa:areaNum(d.areaHa),capim:d.capim||"",condicao:d.condicao||"",modalidade:d.modalidade||"",
    daninhas:(d.daninhas||[]).filter(w=>w.nome&&w.nome.trim()).map(w=>({nome:w.nome.trim(),classe:w.classe||"",estagio:w.estagio||"",infestacao:w.infestacao||""})),
    riscoGC:d.riscoGC||"",riscoGCNota:d.riscoGCNota||"",rocada:d.rocada||"",rocadaNota:d.rocadaNota||"",fotos:(d.fotos||[]).map(f=>({id:f.id,url:f.url,legenda:f.legenda||""})),
    areas:(d.areas||[]).map(x=>({nome:x.nome||"",poligono:x.poligono,areaHa:x.areaHa,kml:x.kml||""})),poligono:null,kml:"",obs:d.obs||"",dataVisita:d.dataVisita||"",criadoEm:d.criadoEm||now,atualizadoEm:now,
    rec:{itens:(d.rec?.itens||[]).filter(i=>i.produto).map(i=>({produto:i.produto,produtoId:i.produtoId||"",unidade:i.unidade||"L",dose:dec(i.dose)})),obs:d.rec?.obs||"",expectativa:(d.rec?.expectativa||"").trim(),vazao:/drone/i.test(d.modalidade||"")?dec(d.rec?.vazao):null,porBomba:!!d.rec?.porBomba,bombasHa:d.rec?.porBomba?dec(d.rec?.bombasHa):null}};
  const ref=S.view.id?db.collection("pastos").doc(S.view.id):db.collection("pastos").doc();
  const ok=await write(ref,data,"Pasto salvo");
  if(ok){ S.dirty=false; if(!S.view.id) S.view={name:"pasto",id:ref.id}; S.draft=clone({...data,id:ref.id}); if(typeof S.draft.areaHa==="number") S.draft.areaHa=String(S.draft.areaHa).replace(".",","); if(!S.draft.daninhas.length) S.draft.daninhas.push({nome:"",classe:"",estagio:"",infestacao:""}); S.draft.rec={itens:S.draft.rec.itens.map(i=>({...i,dose:decStr(i.dose)})),obs:S.draft.rec.obs,expectativa:S.draft.rec.expectativa||"",vazao:decStr(S.draft.rec.vazao),porBomba:!!S.draft.rec.porBomba,bombasHa:decStr(S.draft.rec.bombasHa)}; render(); }
  return ok;
}
async function confirmarImport(){
  const imp=S.importing; const faz=(document.getElementById("imp-faz")?.value||"").trim(); const now=new Date().toISOString();
  const base={clienteId:S.view.id,fazenda:faz,capim:"",condicao:"",modalidade:"",daninhas:[],riscoGC:"",riscoGCNota:"",rocada:"",rocadaNota:"",fotos:[],poligono:null,kml:"",obs:"",dataVisita:today(),criadoEm:now,atualizadoEm:now};
  const ar=i=>({nome:i.nome,poligono:i.poligono,areaHa:i.areaHa,kml:i.arquivo});
  const docs=imp.modo==="junto"&&imp.itens.length>1
    ? [{...base,nome:(imp.nome||"").trim()||imp.itens[0].nome,areaHa:+imp.itens.reduce((s,i)=>s+i.areaHa,0).toFixed(2),areas:imp.itens.map(ar)}]
    : imp.itens.map(i=>({...base,nome:i.nome,areaHa:i.areaHa,areas:[ar(i)]}));
  S.busy=true; render(); let n=0;
  for(const d of docs){ try{ await db.collection("pastos").doc().set(d); n++; }catch(e){} }
  S.busy=false; S.importing=null; render(); toast(n===docs.length?`${n} pasto${n===1?"":"s"} criado${n===1?"":"s"}`:`${n} de ${docs.length} pastos criados. Tente de novo os que faltaram.`);
}

/* ---------- PDF ---------- */
function mapaPng(polys){
  polys=(polys||[]).filter(c=>c&&c.length>=3); if(!polys.length) return null;
  const W=640,H=460,pad=30; const cv=document.createElement("canvas"); cv.width=W; cv.height=H; const g=cv.getContext("2d");
  g.fillStyle="#eef4ea"; g.fillRect(0,0,W,H);
  const all=polys.flat(); const k=Math.cos(centroid(all)[1]*Math.PI/180);
  const P=polys.map(c=>c.map(p=>[p[0]*k,-p[1]])); const fl=P.flat();
  const minx=Math.min(...fl.map(p=>p[0])),maxx=Math.max(...fl.map(p=>p[0])),miny=Math.min(...fl.map(p=>p[1])),maxy=Math.max(...fl.map(p=>p[1]));
  const s=Math.min((W-2*pad)/(maxx-minx||1),(H-2*pad)/(maxy-miny||1)); const ox=(W-(maxx-minx)*s)/2, oy=(H-(maxy-miny)*s)/2;
  const X=p=>(p[0]-minx)*s+ox, Y=p=>(p[1]-miny)*s+oy;
  P.forEach((pts,i)=>{ g.beginPath(); pts.forEach((p,j)=>j?g.lineTo(X(p),Y(p)):g.moveTo(X(p),Y(p))); g.closePath();
    g.fillStyle="rgba(61,122,46,.30)"; g.fill(); g.lineWidth=4; g.strokeStyle="#3d7a2e"; g.lineJoin="round"; g.stroke();
    if(P.length>1){ const c=centroid(pts); g.fillStyle="#18201a"; g.font="bold 26px sans-serif"; g.textAlign="center"; g.textBaseline="middle"; g.fillText(String(i+1),X(c),Y(c)); } });
  // seta norte
  g.fillStyle="#18201a"; g.font="bold 20px sans-serif"; g.textAlign="center"; g.fillText("N",W-28,26); g.beginPath(); g.moveTo(W-28,34); g.lineTo(W-36,52); g.lineTo(W-20,52); g.closePath(); g.fill();
  return cv.toDataURL("image/jpeg",.88);
}
async function fotoJpeg(url){
  try{ const r=await fetch(url); if(!r.ok) return null; const bmp=await createImageBitmap(await r.blob());
    const max=900, sc=Math.min(1,max/Math.max(bmp.width,bmp.height)); const cv=document.createElement("canvas"); cv.width=Math.round(bmp.width*sc); cv.height=Math.round(bmp.height*sc);
    cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height); return {data:cv.toDataURL("image/jpeg",.8),w:cv.width,h:cv.height}; }catch(e){ return null; }
}
const daninhaTxt = w => [w.nome.split(" | ")[0], [w.classe,w.estagio,w.infestacao&&("infest. "+w.infestacao.toLowerCase())].filter(Boolean).join(", ")].filter(Boolean).join(" (")+((w.classe||w.estagio||w.infestacao)?")":"");

async function gerarPdf(){
  if(!window.jspdf?.jsPDF){ toast("O gerador de PDF não carregou. Recarregue a página e tente de novo."); return; }
  const c=cliente(S.view.id)||{}, d=S.draft, cfg=relDe(c);
  const lista=propPastos(S.view.id).filter(r=>r.inc).map(r=>r.p);
  if(!lista.length){ toast("Nenhum pasto com recomendação selecionado."); return; }
  if(S.dirty) await salvarProposta(true);
  S.gerando="Preparando mapas e fotos…"; bar();
  try{
    const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:"mm",format:"a4"});
    const W=210,M=14,CW=W-2*M, BLUE=[20,83,45], INK=[24,32,26], MUT=[93,106,96], GREEN=[61,122,46], LINE=[213,219,210];
    const logo=window.LOGO_PNG||document.getElementById("logo").src; const LW=40, LH=LW*200/670;
    const pr=d.precos||{}; const rs=resumo(lista,pr);
    const titulo="Recomendação Técnica e Proposta Comercial";
    let y=0;
    const feitos=new Set();
    const header=()=>{ const pg=doc.internal.getCurrentPageInfo().pageNumber; if(feitos.has(pg)) return; feitos.add(pg); doc.addImage(logo,"PNG",M,9,LW,LH); doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...MUT);
      if(cfg.logo&&cfg.logoW&&cfg.logoH){ const bh=10, bw=45; const s=Math.min(bw/cfg.logoW,bh/cfg.logoH); const lw=cfg.logoW*s, lh=cfg.logoH*s;
        try{ doc.addImage(cfg.logo,"PNG",W-M-lw,9.5+(bh-lh)/2,lw,lh); doc.text(`${c.nome||""} · Safra ${d.safra}`,W-M-lw-4,16,{align:"right"}); }
        catch(e){ doc.text([cfg.empresa||"", `${c.nome||""} · Safra ${d.safra}`],W-M,12,{align:"right"}); } }
      else doc.text([cfg.empresa||"", `${c.nome||""} · Safra ${d.safra}`],W-M,12,{align:"right"}); doc.setDrawColor(...LINE); doc.setLineWidth(.3); doc.line(M,21,W-M,21); };
    const novaPagina=()=>{ doc.addPage(); header(); y=28; };
    const precisa=h=>{ if(y+h>280) novaPagina(); };
    const h1=(t)=>{ precisa(16); doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(...BLUE); doc.text(t,M,y+6); y+=11; };
    const para=(t,size=9.5,color=INK,style="normal")=>{ if(!t) return; doc.setFont("helvetica",style); doc.setFontSize(size); doc.setTextColor(...color);
      const ls=doc.splitTextToSize(String(t),CW); ls.forEach(l=>{ precisa(5); doc.text(l,M,y+4); y+=size*0.42+0.6; }); y+=1.5; };
    const tabela=(opts)=>{ doc.autoTable({startY:y,margin:{left:M,right:M,top:28,bottom:18},theme:"grid",
        styles:{font:"helvetica",fontSize:8.5,cellPadding:1.8,textColor:INK,lineColor:LINE,lineWidth:.2,overflow:"linebreak"},
        headStyles:{fillColor:BLUE,textColor:255,fontStyle:"bold"},footStyles:{fillColor:[234,238,232],textColor:INK,fontStyle:"bold"},
        alternateRowStyles:{fillColor:[247,249,246]},didDrawPage:()=>{ if(doc.internal.getCurrentPageInfo().pageNumber>1) header(); },...opts}); y=doc.lastAutoTable.finalY+6; };

    // capa
    header(); y=30;
    doc.setFont("helvetica","bold"); doc.setFontSize(20); doc.setTextColor(...INK); doc.text(doc.splitTextToSize(titulo,CW),M,y+8); y+=24;
    doc.setFontSize(11); doc.setTextColor(...GREEN); doc.text("Manejo de plantas daninhas em pastagem",M,y); y+=8;
    const info=[["Cliente",c.nome||""],["Município",[c.municipio,c.uf].filter(Boolean).join(" / ")||"-"],["Safra",d.safra||"-"],["Data",fmtDate(d.data)||"-"],["Distribuidor",cfg.empresa||"-"],["Responsável técnico",cfg.responsavel||"-"]];
    doc.setFontSize(10); info.forEach(([k,v])=>{ doc.setFont("helvetica","normal"); doc.setTextColor(...MUT); doc.text(k,M,y+4); doc.setFont("helvetica","bold"); doc.setTextColor(...INK); doc.text(String(v),M+42,y+4); y+=6.5; });
    y+=4;
    const caixas=(linhas)=>{ linhas.forEach(boxes=>{ const n=boxes.length, bw=(CW-3*(n-1))/n; precisa(24);
      boxes.forEach(([k,v,dest],i)=>{ const x=M+i*(bw+3); if(dest){ doc.setFillColor(...BLUE); } else doc.setFillColor(234,238,232); doc.roundedRect(x,y,bw,20,2,2,"F");
        doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(...(dest?[255,255,255]:MUT)); doc.text(k,x+3,y+6);
        doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.setTextColor(...(dest?[255,255,255]:INK)); doc.text(doc.splitTextToSize(v,bw-6)[0],x+3,y+14.5); });
      y+=23; }); y+=4; };
    const vt=volTot(rs.itens);
    caixas([[["Pastos",String(lista.length)],["Área total",fmtHa(rs.ha)+" ha"]],[["Investimento total",brl(rs.total),true],["Custo médio por hectare",brl(rs.medio)+"/ha",true]]]);
    if(d.obsTec){ h1("Considerações técnicas"); para(d.obsTec); }

    // 1. diagnóstico
    h1("1. Diagnóstico de campo");
    tabela({head:[["Pasto","Área (ha)","Capim","Plantas daninhas","Expectativa de controle"]],
      body:lista.map(p=>[p.nome,fmtHa(p.areaHa),p.capim||"-",(p.daninhas||[]).map(w=>w.nome.split(" | ")[0]).join(", ")||"-",p.rec?.expectativa||"-"]),
      columnStyles:{0:{cellWidth:36},1:{halign:"right",cellWidth:16},2:{cellWidth:32},4:{cellWidth:40}}});

    // 2. recomendação por pasto
    novaPagina(); h1("2. Recomendação técnica por pasto");
    let n=0;
    for(const p of lista){
      n++; S.gerando=`Montando pasto ${n} de ${lista.length}…`; bar();
      const areas=areasDe(p); const mapa=mapaPng(areas.map(a=>a.poligono));
      { // mantém cabeçalho, dados, tabela de recomendação e observações do pasto na mesma página
        const twE=mapa?CW-61:CW; doc.setFontSize(8.8);
        const kvE=[p.capim,p.condicao,p.modalidade,p.rec?.vazao?"x":"",p.rec?.porBomba?"x":"",p.rec?.expectativa,[p.riscoGC,p.riscoGCNota].filter(Boolean).join(" - "),[p.rocada,p.rocadaNota].filter(Boolean).join(" - "),(p.daninhas||[]).map(daninhaTxt).join("; "),fmtDate(p.dataVisita)].filter(Boolean)
          .reduce((s,v)=>s+doc.splitTextToSize(String(v),twE-24).length*3.8+1.2,0);
        const nIt=(p.rec?.itens||[]).filter(i=>i.produto&&dec(i.dose)).length;
        const paraH=t=>t?doc.splitTextToSize(String(t),CW).length*(8.8*0.42+0.6)+1.5:0;
        const bloco=11+Math.max(kvE,mapa?47:0)+2+(nIt+2)*7.2+6+paraH(p.rec?.obs&&("Observação técnica: "+p.rec.obs))+paraH(p.obs&&("Observações de campo: "+p.obs));
        if(y>40 && y+bloco>279) novaPagina(); else precisa(mapa?62:40); }
      doc.setFillColor(...GREEN); doc.rect(M,y,1.2,7,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(11.5); doc.setTextColor(...INK); doc.text(`${p.fazenda?p.fazenda+" - ":""}${p.nome}`,M+4,y+5.2);
      doc.setFont("helvetica","normal"); doc.setFontSize(9.5); doc.setTextColor(...MUT); doc.text(`${fmtHa(p.areaHa)} ha`,W-M,y+5.2,{align:"right"}); y+=11;
      const y0=y; let tx=M, tw=CW;
      if(mapa){ doc.addImage(mapa,"JPEG",M,y,56,40); doc.setDrawColor(...LINE); doc.rect(M,y,56,40);
        const ct=centroid(areas.map(a=>a.poligono).flat()); doc.setFontSize(7); doc.setTextColor(...MUT); doc.text(`${ct[1].toFixed(5)}, ${ct[0].toFixed(5)}${areas.length>1?` · ${areas.length} áreas`:""}`,M,y+44); tx=M+61; tw=CW-61; }
      const kv=[["Capim",p.capim],["Condição",p.condicao],["Modalidade",p.modalidade],["Vazão (drone)",p.rec?.vazao?fmtDose(p.rec.vazao)+" L/ha":""],["Bombas/ha",p.rec?.porBomba?(dec(p.rec.bombasHa)?fmtDose(p.rec.bombasHa)+` bombas de ${BOMBA} L/ha`:"não estimado"):""],["Expectativa",p.rec?.expectativa],["Guarda-chuva",[p.riscoGC,p.riscoGCNota].filter(Boolean).join(" - ")],["Roçada",[p.rocada,p.rocadaNota].filter(Boolean).join(" - ")],["Daninhas",(p.daninhas||[]).map(daninhaTxt).join("; ")],["Visita",fmtDate(p.dataVisita)]].filter(r=>r[1]);
      let yy=y; doc.setFontSize(8.8);
      kv.forEach(([k,v])=>{ doc.setFont("helvetica","bold"); doc.setTextColor(...MUT); doc.text(k,tx,yy+3.5); doc.setFont("helvetica","normal"); doc.setTextColor(...INK);
        const ls=doc.splitTextToSize(String(v),tw-24); doc.text(ls,tx+24,yy+3.5); yy+=ls.length*3.8+1.2; });
      y=Math.max(yy,mapa?y0+47:yy)+2;
      const ha=+p.areaHa||0;
      const pb=p.rec?.porBomba, nb=dec(p.rec?.bombasHa);
      tabela({head:[["Produto",pb?`Dose/bomba ${BOMBA} L`:"Dose/ha","Volume total",pb?"Custo/bomba":"Custo/ha"]],
        body:(p.rec.itens||[]).filter(i=>i.produto&&dec(i.dose)).map(i=>[i.produto,`${fmtDose(i.dose)} ${i.unidade||"L"}`,pb&&!nb?"—":`${fmtN(doseHa(i,p.rec)*fator(i.unidade||"L")*ha,1)} ${uCompra(i.unidade)}`,brl(custoItem(i,pr))]),
        foot:pb?[["Custo por bomba","","",brl(custoBomba(p.rec,pr))]].concat(nb?[[`Custo por hectare (${fmtDose(nb)} bombas/ha)`,"","",brl(recCusto(p.rec,pr))+"/ha"]]:[]):[["Total do pasto","","",brl(recCusto(p.rec,pr))+"/ha"]],rowPageBreak:"avoid",
        columnStyles:{1:{halign:"right"},2:{halign:"right"},3:{halign:"right"}}});
      if(p.rec?.obs){ para("Observação técnica: "+p.rec.obs,8.8); }
      if(p.obs){ para("Observações de campo: "+p.obs,8.8,MUT); }
      const fotos=(p.fotos||[]).slice(0,3);
      if(fotos.length){ const imgs=[]; for(const f of fotos){ const im=await fotoJpeg(f.url); if(im) imgs.push({...im,legenda:f.legenda}); }
        if(imgs.length){ const fw=(CW-8)/3, fh=fw*0.75; precisa(fh+9);
          imgs.forEach((im,i)=>{ const x=M+i*(fw+4); const r=Math.min(fw/im.w,fh/im.h); const iw=im.w*r, ih=im.h*r;
            doc.setFillColor(240,242,238); doc.rect(x,y,fw,fh,"F"); doc.addImage(im.data,"JPEG",x+(fw-iw)/2,y+(fh-ih)/2,iw,ih);
            if(im.legenda){ doc.setFontSize(7.5); doc.setTextColor(...MUT); doc.text(doc.splitTextToSize(im.legenda,fw)[0],x,y+fh+3.5); } });
          y+=fh+8; } }
      y+=4; if(n<lista.length){ precisa(10); doc.setDrawColor(...LINE); doc.line(M,y-2,W-M,y-2); y+=2; }
    }

    // 3. proposta comercial
    novaPagina(); h1("3. Proposta comercial");
    caixas([[["Investimento total",brl(rs.total),true],["Custo médio por hectare",brl(rs.medio)+"/ha",true],["Área total",fmtHa(rs.ha)+" ha"]]]);
    tabela({head:[["Fazenda / pasto","Área (ha)","Modalidade","Custo R$/ha","Total"]],
      body:lista.map(p=>[`${p.fazenda?p.fazenda+" - ":""}${p.nome}`,fmtHa(p.areaHa),[p.modalidade||"-",p.rec?.vazao?fmtDose(p.rec.vazao)+" L/ha":""].filter(Boolean).join(" · "),custoHaTxt(p.rec,pr),semEstimativa(p.rec)?"—":brl(recCusto(p.rec,pr)*(+p.areaHa||0))]),
      foot:[["Total",fmtHa(rs.ha),"",brl(rs.medio),brl(rs.total)]],
      columnStyles:{1:{halign:"right"},3:{halign:"right"},4:{halign:"right"}}});
    precisa(20); doc.setFont("helvetica","bold"); doc.setFontSize(10.5); doc.setTextColor(...INK); doc.text("Resumo de produtos",M,y+4); y+=7;
    tabela({head:[["Produto","Volume total","Preço unitário","Total"]],
      body:rs.itens.map(i=>[i.produto,`${fmtN(i.volume,1)} ${i.unidade}`,`${brl(i.preco)}/${i.unidade}`,brl(i.volume*i.preco)]),
      foot:[["Total","","",brl(rs.total)]],
      columnStyles:{1:{halign:"right"},2:{halign:"right"},3:{halign:"right"}}});
    const cond=[["Validade da proposta",d.validade],["Condição de pagamento",d.pagamento]].filter(r=>r[1]);
    if(cond.length||d.obsCom){ precisa(14); doc.setFont("helvetica","bold"); doc.setFontSize(10.5); doc.setTextColor(...INK); doc.text("Condições",M,y+4); y+=8;
      cond.forEach(([k,v])=>para(`${k}: ${v}`,9.5)); if(d.obsCom) para(d.obsCom,9.5); }
    precisa(34); y+=14; doc.setDrawColor(...INK); doc.setLineWidth(.3); doc.line(M,y,M+75,y);
    doc.setFont("helvetica","bold"); doc.setFontSize(9.5); doc.setTextColor(...INK); doc.text(cfg.responsavel||"Responsável técnico",M,y+5);
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...MUT); doc.text([cfg.empresa||"",[cfg.telefone,cfg.email].filter(Boolean).join(" · ")].filter(Boolean),M,y+9.5);
    { const X2=W-M-75; doc.setDrawColor(...INK); doc.line(X2,y,W-M,y);
      doc.setFont("helvetica","bold"); doc.setFontSize(9.5); doc.setTextColor(...INK); doc.text(doc.splitTextToSize(c.nome||"Cliente",75)[0],X2,y+5);
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...MUT); doc.text("Cliente - de acordo",X2,y+9.5); }
    y+=18; para("Esta recomendação técnica não substitui o receituário agronômico. Leia atentamente o rótulo e a bula dos produtos e siga as instruções de uso. Preços e condições sujeitos a confirmação no fechamento do pedido.",7.5,MUT);

    // rodapé
    const tot=doc.getNumberOfPages();
    for(let i=1;i<=tot;i++){ doc.setPage(i); doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...MUT);
      doc.text(`${cfg.empresa||""}`,M,290); doc.text(`Página ${i} de ${tot}`,W-M,290,{align:"right"}); }

    const nome=`Recomendacao_${(c.nome||"cliente").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"_")}_${(d.safra||"").replace(/\D+/g,"-")}.pdf`;
    const blob=doc.output("blob");
    S.lastPdf={nome,blob};
    try{ const rs=resumo(lista,d.precos); if(window.__guardarPdf) window.__guardarPdf({blob,nome,clienteId:S.view.id,clienteNome:c.nome||"",safra:d.safra||"",pastos:lista.length,areaHa:+rs.ha.toFixed(2),total:+rs.total.toFixed(2)}); }catch(e){ console.warn(e); }
    if(!downloads){ toast("Download não disponível nesta visualização."); return; }
    S.gerando="Confirme o download…"; bar();
    try{ await downloads.save({filename:nome,data:blob}); toast("PDF salvo"); }
    catch(e){ if(e?.code!=="declined") toast("Não foi possível salvar o PDF: "+(e?.message||e?.code||"erro")); }
  }catch(e){ console.error(e); toast("Erro ao gerar o PDF: "+(e?.message||"desconhecido")); }
  finally{ S.gerando=null; bar(); }
}


/* ---------- lista padrão de produtos (semeada uma vez por aparelho) ---------- */
const PRODUTOS_PADRAO=[
 ["tecnologia-xt-s","Tecnologia XT-S","Herbicida","L"],["tecnologia-ultra-s","Tecnologia Ultra-S","Herbicida","L"],
 ["disparo-ultra-s","Disparo Ultra-S","Herbicida","L"],["dominum-xt-s","Dominum XT-S","Herbicida","L"],
 ["garlon-480-br","Garlon 480 BR","Herbicida","L"],["jaguar-ultra-s","Jaguar Ultra-S","Herbicida","L"],
 ["juvix","Juvix","Herbicida","L"],["navius","Navius","Herbicida","g"],["padron","Padron","Herbicida","L"],
 ["palace-ultra-s","Palace Ultra-S","Herbicida","L"],["panoramic-ultra-s","Panoramic Ultra-S","Herbicida","L"],
 ["stopper-xt-s","Stopper XT-S","Herbicida","L"],["tordon-ultra-s","Tordon Ultra-S","Herbicida","L"],
 ["trueno-xt-s","Trueno XT-S","Herbicida","L"],["truper","Truper","Herbicida","L"],
 ["metsulfuron","Metsulfuron","Herbicida","g"],["planador-xt-s","Planador XT-S","Herbicida","L"],
 ["oleo-mineral","Óleo mineral","Adjuvante","mL"],["redutor-ph","Redutor de pH","Adjuvante","mL"],["2-4-d","2,4-D","Herbicida","L"]
];
async function semearProdutos(){
  try{
    const flag=await db.doc("config/semente").get();
    if(flag.exists&&flag.data().produtos>=1) return;
    const atuais=await db.collection("produtos").get();
    const tem=new Set(atuais.docs.map(d=>d.id)), nomes=new Set(atuais.docs.map(d=>(d.data().nome||"").toLowerCase()));
    for(const [id,nome,tipo,unidade] of PRODUTOS_PADRAO){
      if(tem.has(id)||nomes.has(nome.toLowerCase())) continue;
      await db.doc("produtos/"+id).set({nome,tipo,unidade});
    }
    await db.doc("config/semente").set({produtos:1,em:new Date().toISOString()});
  }catch(e){ console.warn("semente produtos",e); }
}
/* ---------- boot ---------- */
(async()=>{
  await (window.__authPronto||Promise.resolve());
  if(!window.claude?.use){ setSync("Modo offline",true); $app.innerHTML=`<div class="card empty"><b>Abra este app pelo link do Claude</b>Os dados ficam guardados online e só carregam dentro do Claude.</div>`; return; }
  db=await claude.use("db");
  if(!db){ setSync("Sem acesso",true); $app.innerHTML=`<div class="card empty"><b>Não foi possível acessar os dados</b>Entre na sua conta Claude e abra o link novamente.</div>`; return; }
  if(!window.__nuvem) semearProdutos();
  claude.use("assets").then(a=>{ assets=a; if(S.view.name==="pasto") render(); });
  claude.use("downloads").then(x=>{ downloads=x; });
  db.collection("produtos").onSnapshot(s=>{ S.produtos=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nome||"").localeCompare(b.nome||"","pt")); if(S.view.name==="ajustes"&&S.view.aba==="novoprod"){} else if(S.view.name==="ajustes"&&!S.dirty){ S.draft.produtos=S.produtos.map(p=>({...p})); render(); } else if(S.view.name==="pasto") { if(!document.activeElement||!document.activeElement.dataset.r) render(); } }, ()=>{});
  db.collection("areas").onSnapshot(s=>{ S.biblio=s.docs.map(d=>({id:d.id,...d.data()})); if(S.view.name==="areas"&&!(document.activeElement&&document.activeElement.dataset.bib)) render(); else if(S.view.name==="pasto"&&S.picker) render(); }, ()=>{});
  db.doc("config/geral").onSnapshot(s=>{ S.config=s.exists?s.data():{}; }, ()=>{});
  const timer=setTimeout(()=>setSync("Sem resposta do servidor",true),10000);
  const fresh=()=>{ if(S.loaded.c&&S.loaded.p){ clearTimeout(timer); setSync("Salvo no aparelho"); } };
  db.collection("clientes").onSnapshot(s=>{ S.clientes=s.docs.map(d=>({id:d.id,...d.data()})); if(!s.metadata.fromCache){S.loaded.c=true;fresh();} if(S.view.name==="lista") render(); else if(S.view.name==="cliente"&&!S.dirty){ if(S.view.id){ const c=cliente(S.view.id); if(c) S.draft=clone(c); } render(); } else bar(); }, err=>{ clearTimeout(timer); setSync("Erro ao sincronizar",true); });
  db.collection("pastos").onSnapshot(s=>{ S.pastos=s.docs.map(d=>({id:d.id,...d.data()})); if(!s.metadata.fromCache){S.loaded.p=true;fresh();} if(S.view.name==="lista"||S.view.name==="cliente"&&!S.dirty||S.view.name==="proposta") render(); }, err=>{ clearTimeout(timer); setSync("Erro ao sincronizar",true); });
  render();
  importarCompartilhados();
})();
async function importarCompartilhados(){
  if(!/compartilhado=1/.test(location.search)||!("caches" in window)) return;
  history.replaceState(null,"",location.pathname);
  try{
    const c=await caches.open("pl-compartilhados"); const reqs=await c.keys(); let itens=[], erros=[];
    for(const r of reqs){ const resp=await c.match(r); const nome=decodeURIComponent(resp.headers.get("x-nome")||"arquivo");
      try{ const f=new File([await resp.blob()],nome); (await readGeoFile(f)).forEach(i=>itens.push({...i,arquivo:nome})); }catch(err){ erros.push(err.message); }
      await c.delete(r); }
    if(itens.length){ const n=await guardarNaBiblioteca(itens); go({name:"areas"}); toast(n?`${n} área${n===1?"":"s"} recebida${n===1?"":"s"} e guardada${n===1?"":"s"} na biblioteca`:"Essas áreas já estavam na biblioteca"); }
    else if(erros.length) toast(erros[0]);
  }catch(e){ toast("Não consegui receber o arquivo compartilhado."); }
}
})();
