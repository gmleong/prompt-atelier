const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("promptStore", {
  list: () => ipcRenderer.invoke("prompts:list"),
  save: (prompt) => ipcRenderer.invoke("prompts:save", prompt),
  remove: (id) => ipcRenderer.invoke("prompts:delete", id)
});

contextBridge.exposeInMainWorld("appConfig", {
  get: () => ipcRenderer.invoke("config:get"),
  save: (cfg) => ipcRenderer.invoke("config:save", cfg),
  ensureGist: (token) => ipcRenderer.invoke("config:ensure-gist", token)
});
