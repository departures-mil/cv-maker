'use strict';
/* Builds the Windows installer: dist/CV-Maker-Setup-<version>.exe */
const path = require('path');
const pkg = require('../package.json');

async function build() {
  const builder = require('electron-builder');
  const fileName = `CV-Maker-Setup-${pkg.version}.exe`;
  await builder.build({
    targets: builder.Platform.WINDOWS.createTarget(['nsis'], builder.Arch.x64),
    config: pkg.build,
    publish: 'never',
  });
  return { fileName, filePath: path.join(__dirname, '..', 'dist', fileName) };
}

module.exports = { build };
if (require.main === module) build().then((r) => console.log('Built', r.filePath)).catch((e) => { console.error(e); process.exit(1); });
