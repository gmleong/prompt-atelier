const { app, BrowserWindow, nativeTheme, nativeImage } = require("electron");
const path = require("path");

const APP_URL = "https://gmleong.github.io/prompt-atelier/";

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
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadURL(APP_URL);
}

/* ── App lifecycle ───────────────────────────────────────────── */
app.whenReady().then(() => {
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
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
