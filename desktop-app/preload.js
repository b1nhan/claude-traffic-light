const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("trafficLight", {
  onStateUpdate: (callback) => {
    ipcRenderer.on("state-update", (_event, state) => callback(state));
  },
  requestCurrentState: () => ipcRenderer.send("request-current-state"),
});
