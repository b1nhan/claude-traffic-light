const { app, BrowserWindow, Tray, Menu, screen, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { startStatusServer } = require("./statusServer");
const { HOOKS, PORT } = require("./hooksConfig");

const TRAY_ICONS = {
  idle: path.join(__dirname, "assets", "gray-16.png"),
  running: path.join(__dirname, "assets", "yellow-16.png"),
  waiting: path.join(__dirname, "assets", "red-16.png"),
  done: path.join(__dirname, "assets", "green-16.png"),
};

let win;
let setupWin;
let tray;
let currentState = { status: "idle", message: "Đang khởi động..." };
let currentMode = 1;
let windowVisible = true;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      win.show();
      win.focus();
    }
  });

  function createWindow() {
    const { width } = screen.getPrimaryDisplay().workAreaSize;

    win = new BrowserWindow({
      width: 110,
      height: 180,
      x: width - 130,
      y: 20,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
      },
    });

    win.setAlwaysOnTop(true, "screen-saver");
    win.loadFile("index.html");

    win.on("close", (e) => {
      if (!app.isQuiting) {
        e.preventDefault();
        win.hide();
        windowVisible = false;
      }
    });
  }

  function createSetupWindow() {
    if (setupWin && !setupWin.isDestroyed()) {
      setupWin.show();
      setupWin.focus();
      return;
    }
    setupWin = new BrowserWindow({
      width: 1200,
      height: 680,
      resizable: false,
      title: "Claude Traffic Light — Hướng dẫn & Cài đặt",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
      },
    });
    setupWin.setMenuBarVisibility(false);
    setupWin.loadFile("setup.html");
    setupWin.on("closed", () => {
      setupWin = null;
    });
  }

  function createTray() {
    tray = new Tray(TRAY_ICONS.idle);
    updateTrayMenu();
  }

  function updateTrayMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: windowVisible ? "Ẩn cửa sổ nổi" : "Hiện cửa sổ nổi",
        click: () => {
          if (windowVisible) {
            win.hide();
          } else {
            win.show();
          }
          windowVisible = !windowVisible;
          updateTrayMenu();
        },
      },
      {
        label: "Hướng dẫn / Cài đặt",
        click: () => createSetupWindow(),
      },
      { type: "separator" },
      {
        label: `Trạng thái: ${currentState.status}`,
        enabled: false,
      },
      { type: "separator" },
      {
        label: "Thoát",
        click: () => {
          app.isQuiting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip(`Claude Traffic Light — ${currentState.status}`);
  }

  function applyState(state) {
    currentState = state;
    if (tray) {
      tray.setImage(TRAY_ICONS[state.status] || TRAY_ICONS.idle);
      updateTrayMenu();
    }
    if (win && !win.isDestroyed()) {
      win.webContents.send("state-update", state);
    }
  }

  // Merge 4 hooks vào settings đã có: không đè hook người dùng đã có,
  // dedupe theo command để bấm "Connect" nhiều lần không tạo hook trùng.
  function mergeHooksIntoSettings(settings) {
    const result = { ...settings };
    const hooks = { ...(settings.hooks || {}) };
    for (const [event, blocks] of Object.entries(HOOKS)) {
      const existing = hooks[event] ? [...hooks[event]] : [];
      for (const block of blocks) {
        const newCommand = block.hooks[0].command;
        const alreadyPresent = existing.some((b) =>
          (b.hooks || []).some((h) => h.command === newCommand)
        );
        if (!alreadyPresent) existing.push(block);
      }
      hooks[event] = existing;
    }
    result.hooks = hooks;
    return result;
  }

  function getScriptPath() {
    return app.isPackaged
      ? path.join(process.resourcesPath, "connect-claude.ps1")
      : path.join(__dirname, "assets", "connect-claude.ps1");
  }

  ipcMain.handle("connect-claude", async () => {
    const claudeDir = path.join(os.homedir(), ".claude");
    const settingsPath = path.join(claudeDir, "settings.json");
    try {
      fs.mkdirSync(claudeDir, { recursive: true });
      let settings = {};
      if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath, "utf8").trim();
        if (raw) {
          try {
            settings = JSON.parse(raw);
          } catch (e) {
            return { success: false, reason: "invalid_json", path: settingsPath };
          }
        }
      }
      const merged = mergeHooksIntoSettings(settings);
      fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), "utf8");
      return { success: true, path: settingsPath };
    } catch (e) {
      return { success: false, reason: e.code || e.message, path: settingsPath };
    }
  });

  ipcMain.handle("get-script-path", () => getScriptPath());
  ipcMain.handle("get-hooks-json", () => JSON.stringify({ hooks: HOOKS }, null, 2));

  ipcMain.on("set-mode", (event, mode) => {
    currentMode = mode;
    if (win && !win.isDestroyed()) {
      if (mode === 1) {
        win.setSize(110, 180);
      } else if (mode === 2) {
        win.setSize(60, 140);
      } else if (mode === 3) {
        win.setSize(60, 60);
      }
      win.webContents.send("mode-update", mode);
    }
  });

  ipcMain.on("request-current-state", (event) => {
    event.reply("state-update", currentState);
    event.reply("mode-update", currentMode);
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();

    const statusServer = startStatusServer(PORT);
    statusServer.emitter.on("state", applyState);
    statusServer.emitter.on("error", (err) => {
      const msg =
        err.code === "EADDRINUSE"
          ? `Cổng ${PORT} đang được dùng bởi ứng dụng khác`
          : `Lỗi server: ${err.message}`;
      applyState({ status: "idle", message: msg, updatedAt: Date.now() });
    });

    const flagPath = path.join(app.getPath("userData"), "first-run-done");
    if (!fs.existsSync(flagPath)) {
      createSetupWindow();
      try {
        fs.mkdirSync(path.dirname(flagPath), { recursive: true });
        fs.writeFileSync(flagPath, String(Date.now()));
      } catch (e) {
        /* non-fatal */
      }
    }
  });

  app.on("window-all-closed", (e) => {
    e.preventDefault();
  });
}
