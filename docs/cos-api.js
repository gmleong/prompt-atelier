/* ═══════════════════════════════════════════════════════════════
   COS API — browser-side data layer (PWA)
   Uses cos-js-sdk-v5 loaded from CDN
   ═══════════════════════════════════════════════════════════════ */

const DATA_FILE = "prompts.json";
const CFG_KEY = "prompt-atelier-config";

function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(CFG_KEY)) || { secretId: "", secretKey: "", bucket: "", region: "ap-guangzhou" };
  } catch { return { secretId: "", secretKey: "", bucket: "", region: "ap-guangzhou" }; }
}

function saveConfig(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

function cachePrompts(prompts) {
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
  return new COS({
    SecretId: cfg.secretId,
    SecretKey: cfg.secretKey
  });
}

function cosGet() {
  return new Promise((resolve, reject) => {
    const cos = getCos();
    const cfg = getConfig();
    if (!cos || !cfg.bucket) return reject(new Error("COS 未配置"));
    cos.getObject({
      Bucket: cfg.bucket, Region: cfg.region, Key: DATA_FILE
    }, (err, data) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(data.Body));
      } catch {
        resolve(null);
      }
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
    }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/* ── Public API (mirrors window.promptStore) ─────────────────── */
const promptStore = {
  async list() {
    const cached = readCache();
    const cfg = getConfig();
    if (cfg.secretId && cfg.bucket) {
      cosGet().then(prompts => {
        if (prompts) cachePrompts(prompts);
      }).catch(err => console.error("COS pull failed:", err.message));
    }
    return cached || [];
  },

  async save(prompt) {
    const cfg = getConfig();
    if (!cfg.secretId || !cfg.bucket) throw new Error("未配置 COS");

    let prompts = readCache() || [];
    const now = new Date().toISOString();
    const tags = Array.isArray(prompt.tags) ? prompt.tags.filter(Boolean) : [];

    const nextPrompt = {
      id: prompt.id || crypto.randomUUID(),
      title: String(prompt.title || "").trim(),
      category: String(prompt.category || "").trim() || "未分类",
      tags,
      content: String(prompt.content || "").trim(),
      notes: String(prompt.notes || "").trim(),
      image: String(prompt.image || "").trim(),
      createdAt: prompt.createdAt || now,
      updatedAt: now
    };

    const index = prompts.findIndex((item) => item.id === nextPrompt.id);
    if (index >= 0) {
      prompts[index] = nextPrompt;
    } else {
      prompts.unshift(nextPrompt);
    }

    cachePrompts(prompts);
    cosPut(prompts).catch(err => console.error("COS push failed:", err.message));
    return prompts;
  },

  async remove(id) {
    const cfg = getConfig();
    if (!cfg.secretId || !cfg.bucket) throw new Error("未配置 COS");

    let prompts = readCache() || [];
    prompts = prompts.filter((item) => item.id !== id);

    cachePrompts(prompts);
    cosPut(prompts).catch(err => console.error("COS push failed:", err.message));
    return prompts;
  }
};

const appConfig = {
  get() { return Promise.resolve(getConfig()); },
  save(cfg) { saveConfig(cfg); return Promise.resolve({ ok: true }); }
};

window.promptStore = promptStore;
window.appConfig = appConfig;
