const { contextBridge, ipcRenderer, shell, clipboard } = require("electron");

// Preload chạy trong sandbox của Electron — chỉ require("electron") được phép,
// KHÔNG được require file cục bộ khác (vd "./hooksConfig") vì sẽ crash toàn bộ
// preload im lặng (window.trafficLight sẽ undefined). hooksJson vì vậy phải
// lấy qua IPC từ main process thay vì tính thẳng ở đây.
contextBridge.exposeInMainWorld("trafficLight", {
  onStateUpdate: (callback) => {
    ipcRenderer.on("state-update", (_event, state) => callback(state));
  },
  requestCurrentState: () => ipcRenderer.send("request-current-state"),
  
  onModeUpdate: (callback) => {
    ipcRenderer.on("mode-update", (_event, mode) => callback(mode));
  },
  setMode: (mode) => ipcRenderer.send("set-mode", mode),

  onOpacityUpdate: (callback) => {
    ipcRenderer.on("opacity-update", (_event, data) => callback(data));
  },

  connectClaude: () => ipcRenderer.invoke("connect-claude"),
  getScriptPath: () => ipcRenderer.invoke("get-script-path"),
  getHooksJson: () => ipcRenderer.invoke("get-hooks-json"),

  getWidgetSettings: () => ipcRenderer.invoke("get-widget-settings"),
  setAlwaysOnTop: (value) => ipcRenderer.send("set-always-on-top", value),
  setOpacity: (value) => ipcRenderer.send("set-opacity", value),
  setPosition: (position) => ipcRenderer.send("set-position", position),
  openPath: (p) => shell.openPath(p),
  showItemInFolder: (p) => shell.showItemInFolder(p),
  copyText: (text) => clipboard.writeText(text),
});
