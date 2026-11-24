/* Ortak çekirdek — Electron preload. window.fcHost'u açar; web/js/host.js bunu kendiliğinden tanır.
   Uygulamanın kendi preload'u varsa bu dosyayı oradan require edebilir:  require('./fc-preload.js');
   contextIsolation:false pencerelerde (sayfa ile preload aynı dünyada; contextBridge orada çalışmaz) nesne doğrudan window'a konur. */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

let info = {};
try { info = ipcRenderer.sendSync('fc:info') || {}; } catch (e) {}
const call = (ch, ...a) => ipcRenderer.invoke(ch, ...a);
const unwrap = (p) => p.then((r) => { if (r && r.ok) return r.data; const e = new Error((r && r.error) || 'ERR'); e.code = (r && r.error) || 'ERR'; throw e; });
let seq = 0;

const fcHost = {
  kind: 'electron',
  platform: info.platform || process.platform,
  version: info.version || '',
  window: {
    minimize: () => call('fc:win:minimize'),
    half: () => call('fc:win:half'),
    toggleFullscreen: () => call('fc:win:fullscreen'),
    close: () => call('fc:win:close'),
    getState: () => call('fc:win:state'),
    onState: (cb) => { const f = (_e, s) => cb(s); ipcRenderer.on('fc:win:state', f); return () => ipcRenderer.removeListener('fc:win:state', f); }
  },
  update: {
    channel: info.channel || 'win-app',
    applyPatch: (bytes, meta) => unwrap(call('fc:update:patch', bytes, meta)),
    installFull: (bytes, meta) => unwrap(call('fc:update:full', bytes, meta)),
    // meta.deferred → yalnız hazırla ('staged'); program kapanınca pencere açmadan kurulur. applyStaged → şimdi kur + yeniden aç.
    deferred: true,
    applyStaged: () => unwrap(call('fc:update:applyStaged'))
  },
  net: {
    download: (url, onProgress) => {
      const id = ++seq;
      const f = (_e, rid, done, finished) => { if (rid === id && onProgress) onProgress({ done, finished: !!finished }); };
      ipcRenderer.on('fc:net:progress', f);
      return call('fc:net:download', id, url).finally(() => ipcRenderer.removeListener('fc:net:progress', f));
    }
  },
  agent: {
    read: () => unwrap(call('fc:agent:read')),
    write: (key, json) => unwrap(call('fc:agent:write', key, json)),
    remove: (key) => unwrap(call('fc:agent:remove', key))
  },
  onMainError: (cb) => { const f = (_e, m) => cb(m); ipcRenderer.on('fc:main-error', f); return () => ipcRenderer.removeListener('fc:main-error', f); },
  openExternal: (url) => call('fc:open', url)
};

function expose(key, api) {
  if (process.contextIsolated === false || !contextBridge) { window[key] = api; return 'window'; }   // contextIsolation:false
  contextBridge.exposeInMainWorld(key, api); return 'bridge';
}
expose('fcHost', fcHost);
module.exports = { expose, fcHost };
