const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('chappy', {
  isDev: process.env.NODE_ENV !== 'production'
});
