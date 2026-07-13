const { app, BrowserWindow, nativeTheme, nativeImage, Tray, Menu, screen } = require("electron");
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

  // Load ball HTML with app icon
  ballWin.loadURL(`data:text/html,
    <html><head><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{display:flex;align-items:center;justify-content:center;width:56px;height:56px;cursor:pointer;-webkit-app-region:drag}
      .ball{
        width:48px;height:48px;border-radius:50%;
        background:linear-gradient(135deg,#C41E3A,#D4464F);
        box-shadow:0 4px 16px rgba(196,30,58,0.4);
        display:flex;align-items:center;justify-content:center;
        transition:transform 0.15s ease;
      }
      .ball:hover{transform:scale(1.1)}
      svg{width:22px;height:22px}
    </style></head>
    <body>
      <div class="ball">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          <path d="m15 5 4 4"/>
        </svg>
      </div>
      <script>
        const {ipcRenderer} = require("electron");
        document.querySelector(".ball").addEventListener("click",()=>{
          ipcRenderer.send("ball-click");
        });
      </script>
    </body></html>
  `);
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

/* ── IPC ─────────────────────────────────────────────────────── */
const { ipcMain } = require("electron");
ipcMain.on("ball-click", () => {
  if (mainWin) {
    mainWin.show();
    mainWin.focus();
    hideBall();
  }
});

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
