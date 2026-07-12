const { app, BrowserWindow, ipcMain, nativeTheme, nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");
const COS = require("cos-nodejs-sdk-v5");

const DATA_FILE = "prompts.json";
const CONFIG_FILE = "config.json";

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
  return { secretId: "", secretKey: "", bucket: "", region: "ap-guangzhou" };
}

function writeConfig(cfg) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), "utf8");
}

function getCos() {
  const cfg = readConfig();
  if (!cfg.secretId || !cfg.secretKey) return null;
  return new COS({
    SecretId: cfg.secretId,
    SecretKey: cfg.secretKey
  });
}

function cosGet(cfg) {
  return new Promise((resolve, reject) => {
    const cos = getCos();
    if (!cos) return reject(new Error("COS 未配置"));
    cos.getObject({
      Bucket: cfg.bucket, Region: cfg.region, Key: DATA_FILE
    }, (err, data) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(data.Body.toString("utf8")));
      } catch {
        resolve(null);
      }
    });
  });
}

function cosPut(cfg, prompts) {
  return new Promise((resolve, reject) => {
    const cos = getCos();
    if (!cos) return reject(new Error("COS 未配置"));
    cos.putObject({
      Bucket: cfg.bucket, Region: cfg.region, Key: DATA_FILE,
      Body: JSON.stringify(prompts, null, 2)
    }, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
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

function readPromptsNow() {
  return readLocalPrompts();
}

function pullFromCOS() {
  const cfg = readConfig();
  if (!cfg.secretId || !cfg.bucket) return;
  cosGet(cfg).then(prompts => {
    if (prompts) writeLocalPrompts(prompts);
  }).catch(err => console.error("COS pull failed:", err.message));
}

async function pushToCOSNow(prompts) {
  const cfg = readConfig();
  if (!cfg.secretId || !cfg.bucket) return;
  try {
    await cosPut(cfg, prompts);
  } catch (err) {
    console.error("COS push failed:", err.message);
  }
}

function writePromptsNow(prompts) {
  writeLocalPrompts(prompts);
  pushToCOSNow(prompts);
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
    icon: path.join(__dirname, "assets", "icon.icns"),
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

/* ── IPC: Prompts ────────────────────────────────────────────── */
ipcMain.handle("prompts:list", async () => {
  // Return local instantly, pull COS in background
  pullFromCOS();
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
  // Set Dock icon (macOS)
  if (process.platform === "darwin" && app.dock) {
    try {
      const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "icon_1024.png"));
      app.dock.setIcon(icon);
    } catch (err) {
      console.error("Failed to set dock icon:", err.message);
    }
  }
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
