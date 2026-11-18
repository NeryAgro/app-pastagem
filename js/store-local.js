/* Armazenamento no aparelho (IndexedDB), com a mesma API que o app já usa
   (db.collection / db.doc / onSnapshot). Cada usuário tem o seu próprio banco no aparelho.
   aoMudar(col,id,dados|null) é chamado a cada gravação local, para a sincronização com a nuvem. */
window.__OFFLINE = true;
window.criarStore = function (DBN, aoMudar) {
  const ST = "docs";
  let idb = null; const mem = {};
  const splitKey = k => { const i = k.lastIndexOf("/"); return [k.slice(0, i), k.slice(i + 1)]; };
  const cp = o => JSON.parse(JSON.stringify(o));
  const meta = { fromCache: false, hasPendingWrites: false };
  function abrir() { return new Promise((res, rej) => { const r = indexedDB.open(DBN, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  const ready = (async () => {
    try {
      idb = await abrir();
      await new Promise(res => {
        const rq = idb.transaction(ST, "readonly").objectStore(ST).openCursor();
        rq.onsuccess = () => { const c = rq.result; if (c) { const [col, id] = splitKey(String(c.key)); (mem[col] = mem[col] || {})[id] = c.value; c.continue(); } else res(); };
        rq.onerror = () => res();
      });
    } catch (e) { console.error("IndexedDB indisponível", e); }
  })();
  function grava(fn) { return new Promise((res, rej) => { if (!idb) return res(); const t = idb.transaction(ST, "readwrite"); fn(t.objectStore(ST)); t.oncomplete = () => res(); t.onerror = () => rej({ code: "unavailable", message: String(t.error) }); }); }
  const subs = {}, dsubs = {};
  const snapC = col => { const docs = Object.entries(mem[col] || {}).map(([id, d]) => ({ id, exists: true, data: () => d, metadata: meta })); return { docs, size: docs.length, empty: !docs.length, metadata: meta, docChanges: () => [] }; };
  const snapD = (col, id) => { const d = (mem[col] || {})[id]; return { id, exists: !!d, data: () => d, metadata: meta }; };
  function emit(col, id) { setTimeout(() => { (subs[col] || []).forEach(f => f(snapC(col))); (dsubs[col + "/" + id] || []).forEach(f => f(snapD(col, id))); }, 0); }
  async function put(col, id, d, remoto) { await ready; (mem[col] = mem[col] || {})[id] = d; await grava(s => s.put(d, col + "/" + id)); emit(col, id); if (!remoto && aoMudar) aoMudar(col, id, d); }
  async function del(col, id, remoto) { await ready; if (mem[col]) delete mem[col][id]; await grava(s => s.delete(col + "/" + id)); emit(col, id); if (!remoto && aoMudar) aoMudar(col, id, null); }
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  function dref(col, id) {
    return {
      id, path: col + "/" + id,
      set: d => put(col, id, cp(d)),
      update: async d => { await ready; const cur = (mem[col] || {})[id]; if (!cur) throw { code: "invalid_argument", message: "Documento não existe" }; await put(col, id, Object.assign(cp(cur), cp(d))); },
      delete: () => del(col, id),
      get: async () => { await ready; return snapD(col, id); },
      onSnapshot(f) { const k = col + "/" + id; (dsubs[k] = dsubs[k] || []).push(f); ready.then(() => f(snapD(col, id))); return () => { dsubs[k] = dsubs[k].filter(x => x !== f); }; }
    };
  }
  const db = {
    doc(p) { const [c, i] = splitKey(p); return dref(c, i); },
    collection(col) {
      return {
        path: col, doc: id => dref(col, id || rid()),
        get: async () => { await ready; return snapC(col); },
        onSnapshot(f) { (subs[col] = subs[col] || []).push(f); ready.then(() => f(snapC(col))); return () => { subs[col] = subs[col].filter(x => x !== f); }; }
      };
    },
    _tudo: async () => { await ready; return cp(mem); },
    _importar: async (dados) => { await ready; let n = 0; for (const col of Object.keys(dados || {})) for (const [id, d] of Object.entries(dados[col] || {})) { await put(col, id, d); n++; } return n; },
    // usados pela sincronização: gravam sem gerar nova pendência de envio
    _ler: async (col, id) => { await ready; const d = (mem[col] || {})[id]; return d ? cp(d) : null; },
    _aplicarRemoto: async (col, id, d) => { if (d) await put(col, id, d, true); else await del(col, id, true); },
    _ready: ready
  };
  const assets = { upload: blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ id: rid(), url: r.result, sizeBytes: blob.size, contentType: blob.type }); r.onerror = () => rej({ code: "unavailable", message: "Não consegui ler a foto" }); r.readAsDataURL(blob); }) };
  const downloads = { save: async ({ filename, data }) => { const blob = data instanceof Blob ? data : new Blob([data]); const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); return { saved: true }; } };
  return { db, assets, downloads };
};
window.instalarStore = function (store) {
  window.__localdb = store.db;
  window.claude = { use: async k => k === "db" ? store.db : k === "assets" ? store.assets : k === "downloads" ? store.downloads : null };
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
};
