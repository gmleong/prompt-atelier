/* ═══════════════════════════════════════════════════════════════
   COS Data Layer — 无认证，直接 REST 读写
   存储桶需开启静态网站托管 + 公开读写权限
   ═══════════════════════════════════════════════════════════════ */

// 部署时改成你自己的 COS 存储桶地址
const BUCKET_URL = "https://your-bucket-1250000000.cos.ap-guangzhou.myqcloud.com";
const DATA_KEY = "prompts.json";
const DATA_URL = `${BUCKET_URL}/${DATA_KEY}`;

function cache(prompts) {
  try { localStorage.setItem("prompts-cache", JSON.stringify(prompts)); } catch { /* */ }
}

function readCache() {
  try {
    const raw = localStorage.getItem("prompts-cache");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text.slice(0, 100)}`);
  }
  return res.json();
}

/* ── Public API ──────────────────────────────────────────────── */
const promptStore = {
  async list() {
    const cached = readCache();
    fetchJSON(DATA_URL).then(p => { if (Array.isArray(p)) cache(p); })
      .catch(err => console.error("COS pull:", err.message));
    return cached || [];
  },

  async save(prompt) {
    // Read latest from COS first
    let prompts = [];
    try { prompts = await fetchJSON(DATA_URL); } catch { /* use cache */ }
    if (!Array.isArray(prompts)) prompts = readCache() || [];

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

    // Write back to COS
    await fetchJSON(DATA_URL, { method: "PUT", body: JSON.stringify(prompts, null, 2) });
    cache(prompts);
    return prompts;
  },

  async remove(id) {
    let prompts = [];
    try { prompts = await fetchJSON(DATA_URL); } catch { prompts = readCache() || []; }
    prompts = prompts.filter((item) => item.id !== id);
    await fetchJSON(DATA_URL, { method: "PUT", body: JSON.stringify(prompts, null, 2) });
    cache(prompts);
    return prompts;
  }
};

// 移除设置面板依赖 — app 直接可用
const appConfig = {
  get() { return Promise.resolve({}); },
  save() { return Promise.resolve({ ok: true }); }
};

window.promptStore = promptStore;
window.appConfig = appConfig;
