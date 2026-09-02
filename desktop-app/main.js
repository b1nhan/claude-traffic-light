const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  screen,
  ipcMain,
  shell,
  clipboard,
} = require("electron");
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

// Nhãn tiếng Việt cho từng trạng thái — khớp với widget-render.js/setup.js để
// người dùng không thấy key nội bộ (idle/running/...) lọt ra ngoài UI.
const STATUS_LABELS = {
  idle: "Đang nghỉ",
  running: "Đang chạy",
  waiting: "Chờ xác nhận",
  done: "Xong việc",
};

let win;
let setupWin;
let tray;
let currentState = { status: "idle", message: "Đang khởi động..." };
let currentMode = 1;
let widgetSettings = { alwaysOnTop: true, opacity: 1, position: "top-right" };

// 9 vị trí neo theo góc màn hình, dùng workArea để né taskbar.
const POSITIONS = {
  "top-left": (wa, w, h) => ({ x: wa.x + 20, y: wa.y + 20 }),
  "top-center": (wa, w, h) => ({
    x: wa.x + Math.round((wa.width - w) / 2),
    y: wa.y + 20,
  }),
  "top-right": (wa, w, h) => ({ x: wa.x + wa.width - w - 20, y: wa.y + 20 }),
  "middle-left": (wa, w, h) => ({
    x: wa.x + 20,
    y: wa.y + Math.round((wa.height - h) / 2),
  }),
  "middle-center": (wa, w, h) => ({
    x: wa.x + Math.round((wa.width - w) / 2),
    y: wa.y + Math.round((wa.height - h) / 2),
  }),
  "middle-right": (wa, w, h) => ({
    x: wa.x + wa.width - w - 20,
    y: wa.y + Math.round((wa.height - h) / 2),
  }),
  "bottom-left": (wa, w, h) => ({ x: wa.x + 20, y: wa.y + wa.height - h - 20 }),
  "bottom-center": (wa, w, h) => ({
    x: wa.x + Math.round((wa.width - w) / 2),
    y: wa.y + wa.height - h - 20,
  }),
  "bottom-right": (wa, w, h) => ({
    x: wa.x + wa.width - w - 20,
    y: wa.y + wa.height - h - 20,
  }),
};

// Nền luôn mờ hơn đèn 20% (sàn 0%) — 2 kênh opacity riêng, chỉ đèn mới đạt 100%.
function sendOpacityUpdate() {
  if (!win || win.isDestroyed()) return;
  const dot = widgetSettings.opacity;
  const bg = Math.max(0, dot - 0.2);
  win.webContents.send("opacity-update", { dot, bg });
}

function applyWindowPosition() {
  if (!win || win.isDestroyed()) return;
  const wa = screen.getPrimaryDisplay().workArea;
  const [w, h] = win.getSize();
  const fn = POSITIONS[widgetSettings.position] || POSITIONS["top-right"];
  const { x, y } = fn(wa, w, h);
  win.setPosition(Math.round(x), Math.round(y));
}

// Dùng chung cho IPC "set-mode" (từ setup.html) và menu tray (Mode 1/2/3).
function applyMode(mode) {
  currentMode = mode;
  if (!win || win.isDestroyed()) return;
  if (mode === 1) win.setSize(160, 180);
  else if (mode === 2) win.setSize(60, 140);
  else if (mode === 3) win.setSize(60, 60);
  applyWindowPosition();
  win.webContents.send("mode-update", mode);
}

function showWidget() {
  if (win) win.show();
}

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
      width: 160,
      height: 180,
      x: width - 180,
      y: 20,
      frame: false,
      transparent: true,
      // Windows/DWM cần backgroundColor rỗng tường minh cho layered window, nếu không
      // đôi khi alpha compositing bị lệch khiến nội dung render mờ hơn opacity thật.
      backgroundColor: "#00000000",
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
      },
    });

    win.setAlwaysOnTop(widgetSettings.alwaysOnTop, "screen-saver");
    win.loadFile("index.html");
    win.webContents.on("did-finish-load", sendOpacityUpdate);

    win.on("close", (e) => {
      if (!app.isQuiting) {
        e.preventDefault();
        win.hide();
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
      height: 900,
      resizable: false,
      title: "Claude Traffic Light — Hướng dẫn & Cài đặt",
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
      },
    });
    setupWin.setMenuBarVisibility(false);
    setupWin.loadFile("setup.html");
    // Link footer (GitHub, report bug) là <a href> thật — chặn điều hướng trong
    // cửa sổ app, mở bằng trình duyệt mặc định thay vào đó.
    setupWin.webContents.on("will-navigate", (e, url) => {
      if (/^https?:\/\//.test(url)) {
        e.preventDefault();
        shell.openExternal(url);
      }
    });
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
        label: "Standard",
        type: "radio",
        checked: currentMode === 1,
        click: () => {
          applyMode(1);
          showWidget();
          updateTrayMenu();
        },
      },
      {
        label: "Compact",
        type: "radio",
        checked: currentMode === 2,
        click: () => {
          applyMode(2);
          showWidget();
          updateTrayMenu();
        },
      },
      {
        label: "Minimal",
        type: "radio",
        checked: currentMode === 3,
        click: () => {
          applyMode(3);
          showWidget();
          updateTrayMenu();
        },
      },
      {
        label: "Ẩn",
        click: () => {
          if (win) win.hide();
        },
      },
      { type: "separator" },
      {
        label: "Home",
        click: () => createSetupWindow(),
      },
      { type: "separator" },
      {
        label: `Trạng thái: ${STATUS_LABELS[currentState.status] || STATUS_LABELS.idle}`,
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
    tray.setToolTip(
      `Claude Traffic Light — ${STATUS_LABELS[currentState.status] || STATUS_LABELS.idle}`,
    );
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
          (b.hooks || []).some((h) => h.command === newCommand),
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
            return {
              success: false,
              reason: "invalid_json",
              path: settingsPath,
            };
          }
        }
      }
      const merged = mergeHooksIntoSettings(settings);
      fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), "utf8");
      return { success: true, path: settingsPath };
    } catch (e) {
      return {
        success: false,
        reason: e.code || e.message,
        path: settingsPath,
      };
    }
  });

  ipcMain.handle("get-script-path", () => getScriptPath());
  ipcMain.handle("get-hooks-json", () =>
    JSON.stringify({ hooks: HOOKS }, null, 2),
  );

  // clipboard/shell không available trong sandboxed preload (Electron 31) —
  // phải gọi qua IPC ở main process thay vì require thẳng trong preload.js.
  ipcMain.handle("copy-text", (event, text) => clipboard.writeText(text));
  ipcMain.handle("show-item-in-folder", (event, p) =>
    shell.showItemInFolder(p),
  );
  ipcMain.handle("open-path", (event, p) => shell.openPath(p));

  ipcMain.on("set-mode", (event, mode) => {
    applyMode(mode);
    updateTrayMenu();
  });

  ipcMain.on("request-current-state", (event) => {
    event.reply("state-update", currentState);
    event.reply("mode-update", currentMode);
  });

  ipcMain.handle("get-widget-settings", () => widgetSettings);

  ipcMain.on("set-always-on-top", (event, value) => {
    widgetSettings.alwaysOnTop = !!value;
    if (win && !win.isDestroyed()) {
      win.setAlwaysOnTop(widgetSettings.alwaysOnTop, "screen-saver");
    }
  });

  ipcMain.on("set-opacity", (event, value) => {
    widgetSettings.opacity = Math.min(1, Math.max(0.2, Number(value) || 1));
    sendOpacityUpdate();
  });

  ipcMain.on("set-position", (event, position) => {
    if (!POSITIONS[position]) return;
    widgetSettings.position = position;
    applyWindowPosition();
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();

    const statusServer = startStatusServer(PORT);
    statusServer.emitter.on("state", applyState);
    statusServer.emitter.on("error", (err) => {
      const msg =
        err.code === "EADDRINUSE"
          ? `Cổng ${PORT} đang bị app khác chiếm mất rồi — tắt app đó đi rồi mở lại Claude Traffic Light nhé`
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
