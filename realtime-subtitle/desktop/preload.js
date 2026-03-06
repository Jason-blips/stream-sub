const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getSources: () => ipcRenderer.invoke("get-sources"),
  sendSubtitle: (text) => ipcRenderer.send("show-subtitle", text),
  showOverlay: () => ipcRenderer.send("show-overlay"),
  hideOverlay: () => ipcRenderer.send("hide-overlay"),
  onSubtitle: (cb) => {
    ipcRenderer.on("subtitle-text", (_, text) => cb(text));
  },
  onSubtitlePreview: (cb) => {
    ipcRenderer.on("subtitle-preview", (_, text) => cb(text));
  },
});
