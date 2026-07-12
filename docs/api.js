/* ═══════════════════════════════════════════════════════════════
   COS Data Layer — 直接用腾讯云 COS 存储 prompts.json
   Works on both desktop (Electron) and mobile (PWA)
   ═══════════════════════════════════════════════════════════════ */

const DATA_FILE = "prompts.json";
const CFG_KEY = "prompt-atelier-config";

function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(CFG_KEY)) || { secretId: "", secretKey: "", bucket: "", region: "ap-guangzhou" };
  } catch { return { secretId: "", secretKey: "", bucket: "", region: "ap-guangzhou" }; }
}

function saveConfigLocal(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

function cache(prompts) {
  try { localStorage.setItem("prompts-cache", JSON.stringify(prompts)); } catch { /* ignore */ }
}

function readCache() {
  try {
    const raw = localStorage.getItem("prompts-cache");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getCos() {
  const cfg = getConfig();
  if (!cfg.secretId || !cfg.secretKey) return null;
  return new COS({ SecretId: cfg.secretId, SecretKey: cfg.secretKey });
}

function cosGet() {
  return new Promise((resolve, reject) => {
    const cos = getCos();
    const cfg = getConfig();
    if (!cos || !cfg.bucket) return reject(new Error("COS 未配置"));
    cos.getObject({ Bucket: cfg.bucket, Region: cfg.region, Key: DATA_FILE }, (err, data) => {
      if (err && err.statusCode === 404) return resolve([]);
      if (err) return reject(err);
      try { resolve(JSON.parse(data.Body)); } catch { resolve([]); }
    });
  });
}

function cosPut(prompts) {
  return new Promise((resolve, reject) => {
    const cos = getCos();
    const cfg = getConfig();
    if (!cos || !cfg.bucket) return reject(new Error("COS 未配置"));
    cos.putObject({
      Bucket: cfg.bucket, Region: cfg.region, Key: DATA_FILE,
      Body: JSON.stringify(prompts, null, 2)
    }, (err) => { if (err) return reject(err); resolve(); });
  });
}

/* ── Public API ──────────────────────────────────────────────── */
const promptStore = {
  async list() {
    const cached = readCache();
    const cfg = getConfig();
    if (cfg.secretId && cfg.bucket) {
      cosGet().then(p => { if (p) cache(p); })
        .catch(err => console.error("COS pull:", err.message));
    }
    return cached || [];
  },

  async save(prompt) {
    const cfg = getConfig();
    if (!cfg.secretId || !cfg.bucket) throw new Error("请先配置 COS");

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

    cache(prompts);
    cosPut(prompts).catch(err => console.error("COS push:", err.message));
    return prompts;
  },

  async remove(id) {
    const cfg = getConfig();
    if (!cfg.secretId || !cfg.bucket) throw new Error("请先配置 COS");

    let prompts = readCache() || [];
    prompts = prompts.filter((item) => item.id !== id);
    cache(prompts);
    cosPut(prompts).catch(err => console.error("COS push:", err.message));
    return prompts;
  }
};

const appConfig = {
  get() { return Promise.resolve(getConfig()); },
  save(cfg) { saveConfigLocal(cfg); return Promise.resolve({ ok: true }); }
};

window.promptStore = promptStore;
window.appConfig = appConfig;
