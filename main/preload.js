const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chappy', {
  isDev: process.env.NODE_ENV !== 'production',
  loadConfig: () => ipcRenderer.invoke('chappy:load-config'),
  saveConfig: (payload) => ipcRenderer.invoke('chappy:save-config', payload),
  saveIcon: (opts) => ipcRenderer.invoke('chappy:save-icon', opts),
  deleteIcon: (opts) => ipcRenderer.invoke('chappy:delete-icon', opts),
  resolveIconUrl: (opts) => ipcRenderer.invoke('chappy:resolve-icon-url', opts),
  fetchAndSaveIcon: (opts) => ipcRenderer.invoke('chappy:fetch-and-save-icon', opts),
  fetchIconFromUrl: (opts) => ipcRenderer.invoke('chappy:fetch-icon-from-url', opts),
  checkForUpdate: () => ipcRenderer.invoke('chappy:check-for-update'),
  getUpdateStatus: () => ipcRenderer.invoke('chappy:get-update-status'),
  setBadgeCount: (count) => ipcRenderer.invoke('chappy:set-badge-count', count),
  restartToApply: () => ipcRenderer.invoke('chappy:restart-to-apply'),
  onUpdateReady: (callback) => {
    ipcRenderer.on('vue-update-ready', () => callback());
  }
});
