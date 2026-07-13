/* ═══════════════════════════════════════════════════════════════
   COS Data Layer — local-first, instant response
   Reads/writes cache instantly, syncs COS in background
   ═══════════════════════════════════════════════════════════════ */

const DATA_URL = "https://prompt-hub-1302053645.cos.ap-guangzhou.myqcloud.com/prompts.json";

function cache(prompts) {
  try { localStorage.setItem("prompts-cache", JSON.stringify(prompts)); } catch { /* */ }
}

function readCache() {
  try { const r = localStorage.getItem("prompts-cache"); return r ? JSON.parse(r) : null; } catch { return null; }
}

async function cosGet() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function cosPut(prompts) {
  await fetch(DATA_URL, { method: "PUT", body: JSON.stringify(prompts, null, 2), headers: { "Content-Type": "application/json" } });
}

/* ── Public API ──────────────────────────────────────────────── */
const promptStore = {
  async list() {
    const cached = readCache();
    // Background sync from COS
    cosGet().then(p => { if (p.length) cache(p); }).catch(e => console.error("COS pull:", e.message));
    return cached || [];
  },

  async save(prompt) {
    // Work on local cache instantly
    let prompts = readCache() || [];
    const now = new Date().toISOString();
    const tags = Array.isArray(prompt.tags) ? prompt.tags.filter(Boolean) : [];
    const next = {
      id: prompt.id || crypto.randomUUID(),
      title: String(prompt.title || "").trim(),
      category: String(prompt.category || "").trim() || "未分类",
      tags, content: String(prompt.content || "").trim(),
      notes: String(prompt.notes || "").trim(),
      image: String(prompt.image || "").trim(),
      createdAt: prompt.createdAt || now, updatedAt: now
    };
    const idx = prompts.findIndex((item) => item.id === next.id);
    if (idx >= 0) prompts[idx] = next; else prompts.unshift(next);

    // Save locally instantly, push to COS in background
    cache(prompts);
    cosPut(prompts).catch(e => console.error("COS push:", e.message));
    return prompts;
  },

  async remove(id) {
    let prompts = readCache() || [];
    prompts = prompts.filter((item) => item.id !== id);
    cache(prompts);
    cosPut(prompts).catch(e => console.error("COS push:", e.message));
    return prompts;
  }
};

const appConfig = {
  get() { return Promise.resolve({}); },
  save() { return Promise.resolve({ ok: true }); }
};

window.promptStore = promptStore;
window.appConfig = appConfig;
