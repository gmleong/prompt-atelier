# Prompt Atelier

一个精致的本地提示词库管理桌面应用，采用 Soft UI Evolution 设计风格。

## 设计系统

- **风格：** Soft UI Evolution — 柔和阴影、微妙深度、现代美学
- **配色：** Indigo 品牌色 (#4F46E5) + 橙色 CTA (#EA580C)
- **字体：** Cormorant Garamond (标题) + Crimson Pro (正文) + Cinzel (标签) + Manrope (UI)
- **无障碍：** WCAG AA+ 对比度、键盘导航、focus 可见
- **深色模式：** 完整支持，自动检测系统偏好

## 功能

- 新建、编辑、删除提示词
- 按标题、标签、内容搜索
- 按分类筛选
- 本地 JSON 持久化保存
- 一键复制提示词内容
- 深色/浅色模式切换
- 实时内容预览
- Toast 通知反馈
- 键盘快捷键 (Ctrl+N 新建, Ctrl+S 保存, Ctrl+F 搜索)

## 启动

```bash
npm install
npm start
```

应用数据默认保存在 Electron `userData` 目录下的 `prompts.json`。

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + N` | 新建提示词 |
| `Ctrl/Cmd + S` | 保存当前编辑 |
| `Ctrl/Cmd + F` | 聚焦搜索框 |
| `Esc` | 取消焦点 |

## 设计系统文件

完整设计规范见 `design-system/MASTER.md`，由 [UI/UX Pro Max](https://uupm.cc) 生成。
