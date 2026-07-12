/* ═══════════════════════════════════════════════════════════════
   Gist API — browser-side data layer (PWA)
   Mirror of Electron main.js prompts:save/list/delete
   ═══════════════════════════════════════════════════════════════ */

const GIST_API = "https://api.github.com/gists";
const DATA_FILE = "prompts.json";
const CFG_KEY = "prompt-atelier-config";

function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(CFG_KEY)) || { token: "", gistId: "" };
  } catch { return { token: "", gistId: "" }; }
}

function saveConfig(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

function cachePrompts(prompts) {
  try {
    localStorage.setItem("prompts-cache", JSON.stringify(prompts));
  } catch { /* quota exceeded — ignore */ }
}

function readCache() {
  try {
    const raw = localStorage.getItem("prompts-cache");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function gistFetch(gistId, token, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json"
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${GIST_API}/${gistId}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gist API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function parsePrompts(gist) {
  try {
    const file = gist.files && gist.files[DATA_FILE];
    if (file && file.content) return JSON.parse(file.content);
  } catch { /* ignore */ }
  return null;
}

/* ── Background sync ──────────────────────────────────────────── */
let pushTimer = null;

function pushToGist(prompts) {
  const cfg = getConfig();
  if (!cfg.token || !cfg.gistId) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    try {
      await gistFetch(cfg.gistId, cfg.token, "PATCH", {
        files: { [DATA_FILE]: { content: JSON.stringify(prompts, null, 2) } }
      });
    } catch (err) {
      console.error("Gist push failed:", err.message);
    }
  }, 300);
}

/* ── Public API (mirrors window.promptStore) ─────────────────── */
const promptStore = {
  async list() {
    // Return cached data instantly
    const cached = readCache();
    // Pull from Gist in background
    const cfg = getConfig();
    if (cfg.token && cfg.gistId) {
      gistFetch(cfg.gistId, cfg.token).then(gist => {
        const prompts = parsePrompts(gist);
        if (prompts) cachePrompts(prompts);
      }).catch(err => console.error("Gist pull failed:", err.message));
    }
    return cached || [];
  },

  async save(prompt) {
    const cfg = getConfig();
    if (!cfg.token || !cfg.gistId) throw new Error("未配置 Gist");

    // Work on local cache
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

    // Save locally instantly, push to Gist in background
    cachePrompts(prompts);
    pushToGist(prompts);
    return prompts;
  },

  async remove(id) {
    const cfg = getConfig();
    if (!cfg.token || !cfg.gistId) throw new Error("未配置 Gist");

    let prompts = readCache() || [];
    prompts = prompts.filter((item) => item.id !== id);

    // Save locally instantly, push to Gist in background
    cachePrompts(prompts);
    pushToGist(prompts);
    return prompts;
  }
};

/* ── Config helpers (mirrors window.appConfig) ───────────────── */
const appConfig = {
  get() { return Promise.resolve(getConfig()); },
  save(cfg) { saveConfig(cfg); return Promise.resolve({ ok: true }); },
  async ensureGist(token) {
    const seed = [
      {
        id: crypto.randomUUID(),
        title: "文章润色",
        category: "写作",
        tags: ["中文", "编辑"],
        content: "请在保留原意的前提下，优化以下内容的表达，使其更清晰、更自然：\n\n{{input}}",
        notes: "适合公众号、说明文、内部文档。",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    const body = {
      description: "Prompt Atelier — 提示词库数据",
      public: false,
      files: { [DATA_FILE]: { content: JSON.stringify(seed, null, 2) } }
    };
    const res = await fetch(GIST_API, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Create Gist failed ${res.status}: ${text.slice(0, 200)}`);
    }
    const gist = await res.json();
    return { ok: true, gistId: gist.id };
  }
};

window.promptStore = promptStore;
window.appConfig = appConfig;
