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
  listWidgets: () => ipcRenderer.invoke('chappy:list-widgets'),
  installWidget: (opts) => ipcRenderer.invoke('chappy:install-widget', opts),
  removeWidget: (opts) => ipcRenderer.invoke('chappy:remove-widget', opts),
  checkForUpdate: () => ipcRenderer.invoke('chappy:check-for-update'),
  getUpdateStatus: () => ipcRenderer.invoke('chappy:get-update-status'),
  getAppVersion: () => ipcRenderer.invoke('chappy:get-app-version'),
  installUpdate: () => ipcRenderer.invoke('chappy:install-update'),
  setBadgeCount: (count) => ipcRenderer.invoke('chappy:set-badge-count', count),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('app-update-status', (_event, status) => callback(status));
  }
});
