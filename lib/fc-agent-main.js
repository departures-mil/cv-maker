/* Asistan Agent — kendi ana süreci olan Electron uygulamaları için (tam çekirdeği kullanmayanlar).
   main.js:    require('./fc-agent-main').install();
   preload.js: require('./fc-agent-preload');      → window.fcAgentHost
   Aynı bilgisayardaki uygulamalar sayaçlarını %APPDATA%/FalconCekirdek/agent/*.json içinde paylaşır (yalnız sayılar). */
'use strict';
const { app, ipcMain } = require('electron');
const fs = (() => { try { return require('original-fs'); } catch (e) { return require('fs'); } })();
const path = require('path');
function install() {
  const dir = () => path.join(app.getPath('appData'), 'FalconCekirdek', 'agent');
  const file = (k) => path.join(dir(), String(k).replace(/[^\w@.-]/g, '_').slice(0, 120) + '.json');
  const wrap = (f) => async (...a) => { try { return { ok: true, data: await f(...a) }; } catch (e) { return { ok: false, error: e.code || e.message || 'ERR' }; } };
  const h = (ch, f) => { ipcMain.removeHandler(ch); ipcMain.handle(ch, wrap(f)); };
  h('fc:agent:write', (_e, key, json) => { const s = String(json); if (s.length > 2e6) throw new Error('TOO_BIG'); JSON.parse(s); fs.mkdirSync(dir(), { recursive: true }); const f = file(key); fs.writeFileSync(f + '.tmp', s); fs.renameSync(f + '.tmp', f); return true; });
  h('fc:agent:read', () => { const out = {}; let names = []; try { names = fs.readdirSync(dir()); } catch (e) { return out; } names.filter((n) => n.endsWith('.json')).slice(0, 200).forEach((n) => { try { out[n.slice(0, -5)] = fs.readFileSync(path.join(dir(), n), 'utf8'); } catch (e) {} }); return out; });
  h('fc:agent:remove', (_e, key) => { try { fs.unlinkSync(file(key)); } catch (e) {} return true; });
}
module.exports = { install };
