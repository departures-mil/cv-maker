'use strict';
// CV Maker — preload. window.fcHost (ortak çekirdek: pencere düğmeleri, güncelleme, CORS'suz indirme) + window.api (CV Maker verisi).
// 2.0.x'teki update:* / contact:send / window:* kanalları kaldırıldı: güncelleme, "Admin ile iletişim" ve pencere düğmeleri çekirdekte.
const { contextBridge, ipcRenderer } = require('electron');
require('./cekirdek/electron/fc-preload.js');

contextBridge.exposeInMainWorld('api', {
  shell: 'fc',
  info: () => ipcRenderer.invoke('app:info'),
  openDataDir: () => ipcRenderer.send('app:openDataDir'),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  createBackup: () => ipcRenderer.invoke('backup:create'),
  backupBeforeUpdate: (to) => ipcRenderer.invoke('backup:beforeUpdate', to),
  restoreBackup: (name) => ipcRenderer.invoke('backup:restore', name),
  openBackupDir: () => ipcRenderer.send('backup:openFolder'),
  importLegacy: (o) => ipcRenderer.invoke('data:importLegacy', o),

  load: () => ipcRenderer.invoke('store:load'),
  saveCvs: (d) => ipcRenderer.invoke('store:saveCvs', d),
  saveSettings: (d) => ipcRenderer.invoke('store:saveSettings', d),
  saveCvsSync: (d) => ipcRenderer.sendSync('store:saveCvsSync', d),
  saveSettingsSync: (d) => ipcRenderer.sendSync('store:saveSettingsSync', d),
  saveText: (o) => ipcRenderer.invoke('file:saveText', o),
  securityGet: () => ipcRenderer.invoke('security:get'),
  securitySet: (on) => ipcRenderer.invoke('security:set', on),
  historySnapshot: (cv) => ipcRenderer.invoke('history:snapshot', cv),
  historyList: (cvId) => ipcRenderer.invoke('history:list', cvId),
  historyRead: (cvId, name) => ipcRenderer.invoke('history:read', { cvId, name }),

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
});

