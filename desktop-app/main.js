const { app, BrowserWindow, Tray, Menu, screen, ipcMain } = require("electron");
const path = require("path");
const WebSocket = require("ws");

const SERVER_URL = "ws://localhost:7317";
const ICONS = {
  idle: path.join(__dirname, "assets", "gray-32.png"),
  running: path.join(__dirname, "assets", "yellow-32.png"),
  waiting: path.join(__dirname, "assets", "red-32.png"),
  done: path.join(__dirname, "assets", "green-32.png"),
};
const TRAY_ICONS = {
  idle: path.join(__dirname, "assets", "gray-16.png"),
  running: path.join(__dirname, "assets", "yellow-16.png"),
  waiting: path.join(__dirname, "assets", "red-16.png"),
  done: path.join(__dirname, "assets", "green-16.png"),
};

let win;
let tray;
let currentState = { status: "idle", message: "Chưa kết nối server" };
let ws;
let windowVisible = true;

function createWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 230,
    height: 92,
    x: width - 250,
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

function connectWS() {
  ws = new WebSocket(SERVER_URL);

  ws.on("open", () => {
    console.log("Connected to status server");
  });

  ws.on("message", (data) => {
    try {
      const state = JSON.parse(data.toString());
      applyState(state);
    } catch (e) {
      console.error("Bad message", e);
    }
  });

  ws.on("close", () => {
    applyState({ status: "idle", message: "Mất kết nối server, đang thử lại..." });
    setTimeout(connectWS, 3000);
  });

  ws.on("error", () => {
    ws.close();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  connectWS();
});

app.on("window-all-closed", (e) => {
  e.preventDefault();
});

ipcMain.on("request-current-state", (event) => {
  event.reply("state-update", currentState);
});
