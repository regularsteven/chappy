const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chappy', {
  isDev: process.env.NODE_ENV !== 'production',
  loadConfig: () => ipcRenderer.invoke('chappy:load-config'),
  saveConfig: (payload) => ipcRenderer.invoke('chappy:save-config', payload)
});
