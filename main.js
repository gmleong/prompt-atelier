const { app, BrowserWindow, nativeTheme, nativeImage, Tray, Menu, screen } = require("electron");
const path = require("path");

const APP_FILE = path.join(__dirname, "renderer", "index.html");

let mainWin = null;
let tray = null;
let isQuitting = false;

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#171717" : "#F5F5F5",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    icon: path.join(__dirname, "assets", "icon.icns"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWin.loadFile(APP_FILE);

  // Minimize to tray instead of dock
  mainWin.on("minimize", (e) => {
    e.preventDefault();
    mainWin.hide();
  });

  // Close → hide to tray
  mainWin.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWin.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "icon_1024.png"));
  const trayIcon = icon.resize({ width: 18, height: 18 });
  tray = new Tray(trayIcon);
  tray.setToolTip("提示词助手");

  const menu = Menu.buildFromTemplate([
    { label: "显示窗口", click: () => { mainWin.show(); mainWin.focus(); } },
    { type: "separator" },
    { label: "退出", click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);

  tray.on("click", () => {
    if (mainWin.isVisible()) {
      mainWin.hide();
    } else {
      mainWin.show();
      mainWin.focus();
    }
  });
}

/* ── App lifecycle ───────────────────────────────────────────── */
app.whenReady().then(() => {
  if (process.platform === "darwin" && app.dock) {
    try {
      const dockIcon = nativeImage.createFromPath(path.join(__dirname, "assets", "icon_1024.png"));
      app.dock.setIcon(dockIcon);
    } catch (err) {
      console.error("Dock icon failed:", err.message);
    }
  }
  createMainWindow();
  createTray();

  app.on("activate", () => {
    if (mainWin) { mainWin.show(); mainWin.focus(); }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
