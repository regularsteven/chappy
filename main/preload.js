const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chappy', {
  isDev: process.env.NODE_ENV !== 'production',
  loadConfig: () => ipcRenderer.invoke('chappy:load-config'),
  saveConfig: (payload) => ipcRenderer.invoke('chappy:save-config', payload),
  saveIcon: (opts) => ipcRenderer.invoke('chappy:save-icon', opts),
  deleteIcon: (opts) => ipcRenderer.invoke('chappy:delete-icon', opts),
  resolveIconUrl: (opts) => ipcRenderer.invoke('chappy:resolve-icon-url', opts)
});
