const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "prompts.json");
const API_KEY = process.env.API_KEY || "prompt-atelier-key";

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Simple auth middleware
function auth(req, res, next) {
  const key = req.headers["x-api-key"] || req.query.key || "";
  if (key !== API_KEY) return res.status(401).json({ error: "unauthorized" });
  next();
}

function readData() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, "[]", "utf8");
      return [];
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch { return []; }
}

function writeData(prompts) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(prompts, null, 2), "utf8");
}

// Health check (no auth)
app.get("/", (_req, res) => res.json({ ok: true, name: "Prompt Atelier API" }));

// List all prompts
app.get("/api/prompts", auth, (_req, res) => {
  res.json(readData());
});

// Save prompt (create or update)
app.post("/api/prompts", auth, (req, res) => {
  const prompts = readData();
  const now = new Date().toISOString();
  const p = req.body;
  if (!p.title || !p.content) return res.status(400).json({ error: "title and content required" });

  const next = {
    id: p.id || crypto.randomUUID(),
    title: String(p.title || "").trim(),
    category: String(p.category || "").trim() || "未分类",
    tags: Array.isArray(p.tags) ? p.tags.filter(Boolean) : [],
    content: String(p.content || "").trim(),
    notes: String(p.notes || "").trim(),
    image: String(p.image || "").trim(),
    createdAt: p.createdAt || now,
    updatedAt: now
  };

  const idx = prompts.findIndex((item) => item.id === next.id);
  if (idx >= 0) prompts[idx] = next;
  else prompts.unshift(next);

  writeData(prompts);
  res.json(prompts);
});

// Delete prompt
app.delete("/api/prompts/:id", auth, (req, res) => {
  const prompts = readData().filter((item) => item.id !== req.params.id);
  writeData(prompts);
  res.json(prompts);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
