const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require("electron");
const path = require("path");
const fs = require("fs");

// 允许桌面捕获权限
app.on("web-contents-created", (_, contents) => {
  contents.session.setPermissionRequestHandler((_, permission, callback) => {
    callback(permission === "media");
  });
});

let mainWindow = null;
let overlayWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 520,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "会议实时字幕",
    icon: fs.existsSync(path.join(__dirname, "icons", "icon.png"))
      ? path.join(__dirname, "icons", "icon.png")
      : undefined,
  });
  mainWindow.loadFile("renderer/main.html");
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    if (overlayWindow) {
      overlayWindow.close();
      overlayWindow = null;
    }
  });
}

function createOverlayWindow() {
  if (overlayWindow) return overlayWindow;
  const primary = screen.getPrimaryDisplay().bounds;
  const w = 900;
  const h = 140;
  overlayWindow = new BrowserWindow({
    width: w,
    height: h,
    x: primary.x + Math.floor((primary.width - w) / 2),
    y: primary.y + primary.height - h - 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile("renderer/overlay.html");
  overlayWindow.on("closed", () => { overlayWindow = null; });
  return overlayWindow;
}

ipcMain.handle("get-sources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["window", "screen"],
    thumbnailSize: { width: 160, height: 90 },
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    appIcon: s.appIcon ? s.appIcon.toDataURL() : null,
  }));
});

ipcMain.handle("get-display-media-id", async (_, sourceId) => {
  return sourceId;
});

ipcMain.on("show-subtitle", (_, text) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send("subtitle-text", text);
    overlayWindow.setAlwaysOnTop(true, "screen-saver");
    overlayWindow.show();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("subtitle-preview", text);
  }
});

ipcMain.on("show-overlay", () => {
  createOverlayWindow();
});

ipcMain.on("hide-overlay", () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
    overlayWindow = null;
  }
});

app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createMainWindow();
});
