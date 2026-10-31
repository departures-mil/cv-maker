'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  info: () => ipcRenderer.invoke('app:info'),
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  toggleFullscreen: () => ipcRenderer.send('window:toggleFullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),
  onFullscreen: (cb) => ipcRenderer.on('window:fullscreen', (_e, v) => cb(v)),
  openDataDir: () => ipcRenderer.send('app:openDataDir'),

  load: () => ipcRenderer.invoke('store:load'),
  saveCvs: (d) => ipcRenderer.invoke('store:saveCvs', d),
  saveSettings: (d) => ipcRenderer.invoke('store:saveSettings', d),
  saveCvsSync: (d) => ipcRenderer.sendSync('store:saveCvsSync', d),
  saveSettingsSync: (d) => ipcRenderer.sendSync('store:saveSettingsSync', d),
  saveText: (o) => ipcRenderer.invoke('file:saveText', o),

  pickAttachments: (o) => ipcRenderer.invoke('attach:pick', o),
  readAttachment: (id) => ipcRenderer.invoke('attach:read', id),
  removeAttachment: (id) => ipcRenderer.invoke('attach:remove', id),
  openAttachment: (id) => ipcRenderer.invoke('attach:open', id),
  gcAttachments: (ids) => ipcRenderer.invoke('attach:gc', ids),

  exportCv: (o) => ipcRenderer.invoke('cv:export', o),
  importCv: (o) => ipcRenderer.invoke('cv:import', o),
  exportPdf: (o) => ipcRenderer.invoke('pdf:export', o),
  renderPdf: (o) => ipcRenderer.invoke('pdf:render', o),
  exportDocx: (o) => ipcRenderer.invoke('docx:export', o),
  pickJpegTarget: (o) => ipcRenderer.invoke('jpeg:pickTarget', o),
  saveJpegs: (o) => ipcRenderer.invoke('jpeg:save', o),

  checkUpdate: (override) => ipcRenderer.invoke('update:check', override),
  downloadUpdate: (m) => ipcRenderer.invoke('update:download', m),
  applyUpdate: (p) => ipcRenderer.invoke('update:apply', p),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (_e, p) => cb(p)),
});
