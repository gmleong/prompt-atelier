const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const fs = require("fs");
const path = require("path");

const DATA_FILE = "prompts.json";
const CONFIG_FILE = "config.json";
const GIST_API = "https://api.github.com/gists";

/* ── Config ──────────────────────────────────────────────────── */
function getConfigPath() {
  return path.join(app.getPath("userData"), CONFIG_FILE);
}

function getDataPath() {
  return path.join(app.getPath("userData"), DATA_FILE);
}

function readConfig() {
  const file = getConfigPath();
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch { /* ignore */ }
  return { token: "", gistId: "" };
}

function writeConfig(cfg) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), "utf8");
}

/* ── Gist API ────────────────────────────────────────────────── */
async function gistFetch(gistId, token, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "Prompt-Atelier"
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

function parsePromptsFromGist(gist) {
  try {
    const file = gist.files && gist.files[DATA_FILE];
    if (file && file.content) return JSON.parse(file.content);
  } catch { /* ignore */ }
  return null;
}

/* ── Data: read / write ──────────────────────────────────────── */
function seedPrompts() {
  const now = new Date().toISOString();
  return [
    {
      id: crypto.randomUUID(),
      title: "文章润色",
      category: "写作",
      tags: ["中文", "编辑"],
      content: "请在保留原意的前提下，优化以下内容的表达，使其更清晰、更自然：\n\n{{input}}",
      notes: "适合公众号、说明文、内部文档。",
      createdAt: now,
      updatedAt: now
    },
    {
      id: crypto.randomUUID(),
      title: "需求拆解",
      category: "产品",
      tags: ["分析", "规划"],
      content: "请把下面的需求拆成用户目标、约束、边界情况、验收标准，并给出 MVP 建议：\n\n{{requirement}}",
      notes: "用于项目 kickoff。",
      createdAt: now,
      updatedAt: now
    },
    {
      id: crypto.randomUUID(),
      title: "代码审查助手",
      category: "开发",
      tags: ["代码", "审查", "质量"],
      content: "请审查以下代码，关注：1) 潜在 bug 2) 性能问题 3) 安全隐患 4) 可读性改进。给出具体修改建议：\n\n{{code}}",
      notes: "适用于 PR review 场景。",
      createdAt: now,
      updatedAt: now
    },
    {
      id: crypto.randomUUID(),
      title: "周报生成",
      category: "运营",
      tags: ["周报", "总结", "汇报"],
      content: "根据以下工作内容，生成一份结构清晰的周报，包含：本周完成、进行中、下周计划、风险与求助：\n\n{{tasks}}",
      notes: "适合团队周会汇报。",
      createdAt: now,
      updatedAt: now
    }
  ];
}

function readLocalPrompts() {
  const file = getDataPath();
  if (!fs.existsSync(file)) {
    const initial = seedPrompts();
    fs.writeFileSync(file, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function writeLocalPrompts(prompts) {
  fs.writeFileSync(getDataPath(), JSON.stringify(prompts, null, 2), "utf8");
}

/* ── Local-first, instant response ───────────────────────────── */
let gistPushTimer = null;
let gistPullTimer = null;

// Read: always return local instantly, pull Gist in background
function readPromptsNow() {
  return readLocalPrompts();
}

function pullFromGist() {
  const cfg = readConfig();
  if (!cfg.token || !cfg.gistId) return;
  clearTimeout(gistPullTimer);
  gistPullTimer = setTimeout(async () => {
    try {
      const gist = await gistFetch(cfg.gistId, cfg.token);
      const prompts = parsePromptsFromGist(gist);
      if (prompts) writeLocalPrompts(prompts);
    } catch (err) {
      console.error("Gist pull failed:", err.message);
    }
  }, 200);
}

// Write: save locally now, push to Gist in background (debounced)
function writePromptsNow(prompts) {
  writeLocalPrompts(prompts);
  const cfg = readConfig();
  if (!cfg.token || !cfg.gistId) return;
  clearTimeout(gistPushTimer);
  gistPushTimer = setTimeout(async () => {
    try {
      await gistFetch(cfg.gistId, cfg.token, "PATCH", {
        files: { [DATA_FILE]: { content: JSON.stringify(prompts, null, 2) } }
      });
    } catch (err) {
      console.error("Gist push failed:", err.message);
    }
  }, 300);
}

// Force flush pending push (called before reading from Gist)
async function flushPush() {
  clearTimeout(gistPushTimer);
  // push is fire-and-forget; just ensure timer is cleared
}

async function ensureGist(token) {
  // Create a new Gist with seed data
  const seed = seedPrompts();
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
      "Content-Type": "application/json",
      "User-Agent": "Prompt-Atelier"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Create Gist failed ${res.status}: ${text.slice(0, 200)}`);
  }
  const gist = await res.json();
  return gist.id;
}

/* ── Window ──────────────────────────────────────────────────── */
function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#171717" : "#F5F5F5",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

/* ── IPC: Config ─────────────────────────────────────────────── */
ipcMain.handle("config:get", async () => {
  return readConfig();
});

ipcMain.handle("config:save", async (_event, cfg) => {
  writeConfig(cfg);
  return { ok: true };
});

ipcMain.handle("config:ensure-gist", async (_event, token) => {
  try {
    const gistId = await ensureGist(token);
    const cfg = { token, gistId };
    writeConfig(cfg);
    return { ok: true, gistId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

/* ── IPC: Prompts ────────────────────────────────────────────── */
ipcMain.handle("prompts:list", async () => {
  // Return local instantly, pull Gist in background
  pullFromGist();
  return readPromptsNow();
});

ipcMain.handle("prompts:save", async (_event, prompt) => {
  const prompts = readPromptsNow();
  const now = new Date().toISOString();
  const tags = Array.isArray(prompt.tags)
    ? prompt.tags.filter(Boolean)
    : [];

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

  writePromptsNow(prompts); // instant local + background Gist push
  return prompts;
});

ipcMain.handle("prompts:delete", async (_event, id) => {
  const prompts = readPromptsNow();
  const filtered = prompts.filter((item) => item.id !== id);
  writePromptsNow(filtered); // instant local + background Gist push
  return filtered;
});

/* ── App lifecycle ───────────────────────────────────────────── */
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
