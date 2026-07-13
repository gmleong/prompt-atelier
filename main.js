const { app, BrowserWindow, nativeTheme, nativeImage, screen } = require("electron");
const path = require("path");

const APP_FILE = path.join(__dirname, "renderer", "index.html");

let mainWin = null;
let ballWin = null;

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

  // Minimize → show floating ball
  mainWin.on("minimize", () => {
    showBall();
  });

  // Close → hide to ball instead of quitting
  mainWin.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWin.hide();
      showBall();
    }
  });

  mainWin.on("restore", () => {
    hideBall();
  });

  mainWin.on("show", () => {
    hideBall();
  });
}

function createBall() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const ballSize = 56;

  ballWin = new BrowserWindow({
    width: ballSize,
    height: ballSize,
    x: screenW - ballSize - 20,
    y: screenH - ballSize - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: true,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  ballWin.loadFile(path.join(__dirname, "assets", "ball.html"));

  // Native click — no IPC needed
  ballWin.webContents.on("before-input-event", (event, input) => {
    if (input.type === "mouseDown") {
      event.preventDefault();
      if (mainWin) {
        mainWin.show();
        mainWin.focus();
        hideBall();
      }
    }
  });
}

function showBall() {
  if (ballWin && !ballWin.isDestroyed()) {
    ballWin.show();
  } else {
    createBall();
  }
}

function hideBall() {
  if (ballWin && !ballWin.isDestroyed()) {
    ballWin.hide();
  }
}

function destroyBall() {
  if (ballWin && !ballWin.isDestroyed()) {
    ballWin.destroy();
    ballWin = null;
  }
}

/* ── App lifecycle ───────────────────────────────────────────── */
app.isQuitting = false;

app.whenReady().then(() => {
  if (process.platform === "darwin" && app.dock) {
    try {
      const icon = nativeImage.createFromPath(path.join(__dirname, "assets", "icon_1024.png"));
      app.dock.setIcon(icon);
    } catch (err) {
      console.error("Failed to set dock icon:", err.message);
    }
  }
  createMainWindow();
  createBall();
  hideBall(); // hidden initially

  app.on("activate", () => {
    if (mainWin) {
      mainWin.show();
      hideBall();
    }
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
  destroyBall();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
