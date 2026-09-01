const { contextBridge, ipcRenderer, shell, clipboard } = require("electron");
const { HOOKS } = require("./hooksConfig");

contextBridge.exposeInMainWorld("trafficLight", {
  onStateUpdate: (callback) => {
    ipcRenderer.on("state-update", (_event, state) => callback(state));
  },
  requestCurrentState: () => ipcRenderer.send("request-current-state"),

  connectClaude: () => ipcRenderer.invoke("connect-claude"),
  getScriptPath: () => ipcRenderer.invoke("get-script-path"),
  openPath: (p) => shell.openPath(p),
  showItemInFolder: (p) => shell.showItemInFolder(p),
  copyText: (text) => clipboard.writeText(text),
  hooksJson: JSON.stringify({ hooks: HOOKS }, null, 2),
});
