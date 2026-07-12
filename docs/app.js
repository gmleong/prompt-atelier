/* ═══════════════════════════════════════════════════════════════
   Prompt Atelier — Vertical + Overlay Editor Logic
   ═══════════════════════════════════════════════════════════════ */

const state = {
  prompts: [],
  activeId: "",
  search: "",
  category: "",
  theme: "light",
  editorOpen: false
};

const $ = (sel) => document.querySelector(sel);

const el = {
  searchInput:     $("#searchInput"),
  categoryFilter:  $("#categoryFilter"),
  resultCount:     $("#resultCount"),
  promptList:      $("#promptList"),
  overlay:         $("#editorOverlay"),
  overlayBackdrop: $("#overlayBackdrop"),
  closeEditor:     $("#closeEditor"),
  editorTitle:     $("#editorTitle"),
  previewTitle:    $("#previewTitle"),
  previewCategory: $("#previewCategory"),
  previewBody:     $("#previewBody"),
  previewTags:     $("#previewTags"),
  previewImage:    $("#previewImage"),
  deleteButton:    $("#deleteButton"),
  duplicateButton: $("#duplicateButton"),
  themeToggle:     $("#themeToggle"),
  fabNew:          $("#fabNew"),
  toastContainer:  $("#toastContainer"),
  form:            $("#promptForm"),
  titleInput:      $("#titleInput"),
  categoryInput:   $("#categoryInput"),
  tagsInput:       $("#tagsInput"),
  contentInput:    $("#contentInput"),
  notesInput:      $("#notesInput"),
  imageInput:      $("#imageInput"),
  imageDropZone:   $("#imageDropZone"),
  imagePreview:    $("#imagePreview"),
  removeImageBtn:  $("#removeImage"),
  // Settings
  settingsBtn:     $("#settingsBtn"),
  settingsOverlay: $("#settingsOverlay"),
  settingsBackdrop:$("#settingsBackdrop"),
  closeSettings:   $("#closeSettings"),
  settingsForm:    $("#settingsForm"),
  ghToken:         $("#ghToken"),
  ghGistId:        $("#ghGistId"),
  autoCreateBtn:   $("#autoCreateBtn"),
  settingsStatus:  $("#settingsStatus")
};

/* ── Toast ──────────────────────────────────────────────────── */
function toast(message, type = "info", duration = 2000) {
  const node = document.createElement("div");
  node.className = `toast toast--${type}`;
  node.textContent = message;
  el.toastContainer.append(node);
  setTimeout(() => {
    node.classList.add("toast--out");
    node.addEventListener("animationend", () => node.remove());
  }, duration);
}

/* ── Theme ──────────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem("prompt-atelier-theme");
  if (saved === "dark" || saved === "light") {
    state.theme = saved;
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    state.theme = "dark";
  }
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  localStorage.setItem("prompt-atelier-theme", state.theme);
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
}

/* ── Editor Overlay ─────────────────────────────────────────── */
function openEditor(editId) {
  if (editId) {
    state.activeId = editId;
    syncEditor();
    el.editorTitle.textContent = "编辑提示词";
  } else {
    state.activeId = "";
    syncEditor();
    el.editorTitle.textContent = "新建提示词";
  }
  el.overlay.classList.add("open");
  el.overlay.setAttribute("aria-hidden", "false");
  state.editorOpen = true;
  renderList();
}

function closeEditor() {
  el.overlay.classList.remove("open");
  el.overlay.setAttribute("aria-hidden", "true");
  state.editorOpen = false;
  state.activeId = "";
  renderList();
}

/* ── Utilities ──────────────────────────────────────────────── */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

/* ── Image ──────────────────────────────────────────────────── */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("请选择图片文件"));
    if (file.size > MAX_IMAGE_BYTES) return reject(new Error("图片不能超过 2 MB"));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("读取失败"));
    reader.readAsDataURL(file);
  });
}

function showImagePreview(dataUrl) {
  el.imagePreview.querySelector("img").src = dataUrl;
  el.imagePreview.style.display = "block";
  el.imageDropZone.style.display = "none";
}

function clearImage() {
  el.imagePreview.querySelector("img").src = "";
  el.imagePreview.style.display = "none";
  el.imageDropZone.style.display = "flex";
  el.imageInput.value = "";
}

function activePrompt() {
  return state.prompts.find((p) => p.id === state.activeId) || null;
}

function filteredPrompts() {
  const q = state.search.trim().toLowerCase();
  return state.prompts.filter((p) => {
    if (state.category && p.category !== state.category) return false;
    if (!q) return true;
    const haystack = [p.title, p.category, p.content, p.notes, ...(p.tags || [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/* ── Render: Categories ─────────────────────────────────────── */
function renderCategories() {
  const cats = [...new Set(state.prompts.map((p) => p.category).filter(Boolean))];
  const current = state.category;
  el.categoryFilter.innerHTML = '<option value="">全部分类</option>';
  cats.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    opt.selected = cat === current;
    el.categoryFilter.append(opt);
  });
}

/* ── Render: Card Grid ──────────────────────────────────────── */
function renderList() {
  const prompts = filteredPrompts();
  el.resultCount.textContent = `${prompts.length}`;
  el.promptList.innerHTML = "";

  if (!prompts.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有匹配结果。调整筛选或点 + 新建。";
    el.promptList.append(empty);
    return;
  }

  prompts.forEach((p) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `prompt-card${p.id === state.activeId ? " active" : ""}`;
    card.setAttribute("role", "option");
    card.setAttribute("aria-selected", p.id === state.activeId ? "true" : "false");

    const preview = (p.content || "").replaceAll("\n", " ").trim().slice(0, 120);
    const notesPreview = (p.notes || "").replaceAll("\n", " ").trim().slice(0, 80);
    const updatedAt = formatDate(p.updatedAt || p.createdAt);
    const tagMarkup = (p.tags || []).length
      ? (p.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")
      : "";

    card.innerHTML = `
      <div class="prompt-card__header">
        <h3 class="prompt-card__title">${escapeHtml(p.title || "未命名")}</h3>
        <span class="chip">${escapeHtml(p.category || "未分类")}</span>
      </div>
      ${p.image ? `<div class="prompt-card__thumb"><img src="${escapeHtml(p.image)}" alt="" loading="lazy" /></div>` : ""}
      <div class="prompt-card__snippet">${escapeHtml(preview || "暂无内容")}</div>
      ${notesPreview ? `<div class="prompt-card__note">${escapeHtml(notesPreview)}</div>` : ""}
      ${tagMarkup ? `<div class="tag-row">${tagMarkup}</div>` : ""}
      <div class="prompt-card__footer">
        <span class="prompt-card__meta"><strong>更新</strong> ${escapeHtml(updatedAt)}</span>
      </div>
    `;

    card.addEventListener("click", () => {
      openEditor(p.id);
    });

    el.promptList.append(card);
  });
}

/* ── Sync: Editor ───────────────────────────────────────────── */
function syncEditor() {
  const p = activePrompt();
  el.deleteButton.disabled = !p;

  if (!p) {
    el.form.dataset.id = "";
    el.form.dataset.createdAt = "";
    el.titleInput.value = "";
    el.categoryInput.value = "";
    el.tagsInput.value = "";
    el.contentInput.value = "";
    el.notesInput.value = "";
    clearImage();
    syncPreviewFromForm();
    return;
  }

  el.form.dataset.id = p.id;
  el.form.dataset.createdAt = p.createdAt || "";
  el.titleInput.value = p.title || "";
  el.categoryInput.value = p.category || "";
  el.tagsInput.value = (p.tags || []).join(", ");
  el.contentInput.value = p.content || "";
  el.notesInput.value = p.notes || "";

  // Restore image
  if (p.image) {
    showImagePreview(p.image);
  } else {
    clearImage();
  }

  syncPreviewFromForm();
}

/* ── Sync: Preview ──────────────────────────────────────────── */
function syncPreviewFromForm() {
  const title = el.titleInput.value.trim() || "未命名提示词";
  const category = el.categoryInput.value.trim() || "未分类";
  const content = el.contentInput.value.trim();
  const notes = el.notesInput.value.trim();
  const tags = el.tagsInput.value.split(",").map((t) => t.trim()).filter(Boolean);

  el.previewTitle.textContent = title;
  el.previewCategory.textContent = category;

  // Sync image preview
  const imgEl = el.imagePreview.querySelector("img");
  const imgData = (imgEl && imgEl.src && imgEl.src.startsWith("data:")) ? imgEl.src : "";
  const previewImgEl = el.previewImage.querySelector("img");
  if (imgData) {
    previewImgEl.src = imgData;
    el.previewImage.style.display = "block";
  } else {
    previewImgEl.src = "";
    el.previewImage.style.display = "none";
  }

  if (content) {
    el.previewBody.textContent = content.slice(0, 160);
  } else if (notes) {
    el.previewBody.textContent = notes.slice(0, 160);
  } else {
    el.previewBody.textContent = "填写内容后这里会同步显示摘要。";
  }

  el.previewTags.innerHTML = "";
  if (!tags.length) {
    const empty = document.createElement("span");
    empty.className = "tag";
    empty.textContent = "还没有标签";
    el.previewTags.append(empty);
    return;
  }
  tags.forEach((t) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = t;
    el.previewTags.append(span);
  });
}

/* ── Reload ─────────────────────────────────────────────────── */
async function reloadPrompts(nextActiveId = state.activeId) {
  state.prompts = await window.promptStore.list();
  state.activeId =
    nextActiveId && state.prompts.some((p) => p.id === nextActiveId)
      ? nextActiveId
      : "";

  renderCategories();
  syncEditor();
  renderList();
}

/* ── Events ─────────────────────────────────────────────────── */

el.searchInput.addEventListener("input", (e) => {
  state.search = e.target.value;
  renderList();
});

el.categoryFilter.addEventListener("change", (e) => {
  state.category = e.target.value;
  renderList();
});

// FAB: open editor for new prompt
el.fabNew.addEventListener("click", () => {
  openEditor(null);
  setTimeout(() => el.titleInput.focus(), 300);
});

// Close editor
el.closeEditor.addEventListener("click", closeEditor);
el.overlayBackdrop.addEventListener("click", closeEditor);

// Save
el.form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = el.titleInput.value.trim();
  const content = el.contentInput.value.trim();

  if (!title) { toast("请填写标题", "error"); el.titleInput.focus(); return; }
  if (!content) { toast("请填写内容", "error"); el.contentInput.focus(); return; }

  const imgEl = el.imagePreview.querySelector("img");
  const imageData = (imgEl && imgEl.src && imgEl.src.startsWith("data:")) ? imgEl.src : "";

  const prompt = {
    id: el.form.dataset.id,
    createdAt: el.form.dataset.createdAt,
    title,
    category: el.categoryInput.value.trim() || "未分类",
    tags: el.tagsInput.value.split(",").map((t) => t.trim()).filter(Boolean),
    content,
    notes: el.notesInput.value.trim(),
    image: imageData
  };

  const isNew = !el.form.dataset.id;
  await window.promptStore.save(prompt);
  await reloadPrompts(prompt.id);
  closeEditor();
  toast(isNew ? "已创建" : "已更新", "success");
});

// Delete
el.deleteButton.addEventListener("click", async () => {
  if (!state.activeId) return;
  const p = activePrompt();
  const name = p ? p.title : "此提示词";
  await window.promptStore.remove(state.activeId);
  closeEditor();
  await reloadPrompts("");
  toast(`"${name}" 已删除`, "info");
});

// Copy
el.duplicateButton.addEventListener("click", async () => {
  const content = el.contentInput.value || "";
  if (!content) { toast("没有可复制的内容", "error"); return; }
  await navigator.clipboard.writeText(content);
  toast("已复制到剪贴板", "success");
});

// Live preview
[el.titleInput, el.categoryInput, el.tagsInput, el.contentInput, el.notesInput].forEach(
  (input) => input.addEventListener("input", () => syncPreviewFromForm())
);

// Theme
el.themeToggle.addEventListener("click", toggleTheme);

// Image upload
el.imageDropZone.addEventListener("click", () => el.imageInput.click());

el.imageInput.addEventListener("change", async () => {
  const file = el.imageInput.files[0];
  if (!file) return;
  try {
    const dataUrl = await loadImageFile(file);
    showImagePreview(dataUrl);
    syncPreviewFromForm();
  } catch (err) {
    toast(err.message, "error");
    el.imageInput.value = "";
  }
});

el.imageDropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
  el.imageDropZone.classList.add("image-upload__drop--over");
});

el.imageDropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  e.stopPropagation();
  el.imageDropZone.classList.remove("image-upload__drop--over");
});

el.imageDropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  el.imageDropZone.classList.remove("image-upload__drop--over");
  const file = e.dataTransfer.files[0];
  if (!file) return;
  try {
    const dataUrl = await loadImageFile(file);
    showImagePreview(dataUrl);
    syncPreviewFromForm();
  } catch (err) {
    toast(err.message, "error");
  }
});

el.removeImageBtn.addEventListener("click", () => {
  clearImage();
  syncPreviewFromForm();
});

/* ── Settings ───────────────────────────────────────────────── */
function openSettings() {
  loadSettingsForm();
  el.settingsOverlay.classList.add("open");
  el.settingsOverlay.setAttribute("aria-hidden", "false");
}

function closeSettingsPanel() {
  el.settingsOverlay.classList.remove("open");
  el.settingsOverlay.setAttribute("aria-hidden", "true");
  el.settingsStatus.textContent = "";
}

async function loadSettingsForm() {
  try {
    const cfg = await window.appConfig.get();
    el.ghToken.value = cfg.token || "";
    el.ghGistId.value = cfg.gistId || "";
  } catch (err) {
    // appConfig not available (e.g. in PWA mode) — ignore
  }
}

el.settingsBtn.addEventListener("click", openSettings);
el.closeSettings.addEventListener("click", closeSettingsPanel);
el.settingsBackdrop.addEventListener("click", closeSettingsPanel);

el.autoCreateBtn.addEventListener("click", async () => {
  const token = el.ghToken.value.trim();
  if (!token) {
    el.settingsStatus.textContent = "请先输入 GitHub Token";
    el.settingsStatus.className = "settings-status settings-status--error";
    return;
  }
  el.autoCreateBtn.disabled = true;
  el.settingsStatus.textContent = "正在创建 Gist…";
  el.settingsStatus.className = "settings-status settings-status--info";
  try {
    const result = await window.appConfig.ensureGist(token);
    if (result.ok) {
      el.ghGistId.value = result.gistId;
      el.settingsStatus.textContent = "Gist 创建成功！";
      el.settingsStatus.className = "settings-status settings-status--success";
      await window.appConfig.save({ token, gistId: result.gistId });
      // Reload data from new Gist
      await reloadPrompts("");
      toast("同步已就绪", "success");
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    el.settingsStatus.textContent = `创建失败：${err.message}`;
    el.settingsStatus.className = "settings-status settings-status--error";
  } finally {
    el.autoCreateBtn.disabled = false;
  }
});

el.settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = el.ghToken.value.trim();
  const gistId = el.ghGistId.value.trim();
  if (!token) {
    el.settingsStatus.textContent = "请输入 GitHub Token";
    el.settingsStatus.className = "settings-status settings-status--error";
    return;
  }
  try {
    await window.appConfig.save({ token, gistId });
    el.settingsStatus.textContent = "设置已保存";
    el.settingsStatus.className = "settings-status settings-status--success";
    await reloadPrompts("");
    toast("设置已保存", "success");
  } catch (err) {
    el.settingsStatus.textContent = `保存失败：${err.message}`;
    el.settingsStatus.className = "settings-status settings-status--error";
  }
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl+N: new (open editor)
  if ((e.metaKey || e.ctrlKey) && e.key === "n") {
    e.preventDefault();
    openEditor(null);
    setTimeout(() => el.titleInput.focus(), 300);
  }
  // Ctrl+S: save
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    if (state.editorOpen) {
      el.form.requestSubmit();
    }
  }
  // Ctrl+F: search
  if ((e.metaKey || e.ctrlKey) && e.key === "f") {
    e.preventDefault();
    if (!state.editorOpen) {
      el.searchInput.focus();
      el.searchInput.select();
    }
  }
  // Escape: close editor
  if (e.key === "Escape" && state.editorOpen) {
    closeEditor();
  }
});

/* ── Init ───────────────────────────────────────────────────── */
initTheme();
reloadPrompts();

// Background sync polling (for PWA / multi-device)
setInterval(async () => {
  if (state.editorOpen) return; // don't refresh while editing
  try {
    const fresh = await window.promptStore.list();
    const same = JSON.stringify(fresh) === JSON.stringify(state.prompts);
    if (!same) {
      state.prompts = fresh;
      renderCategories();
      renderList();
    }
  } catch { /* ignore */ }
}, 10000);
