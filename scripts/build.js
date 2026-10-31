'use strict';
/* Builds the Windows portable .exe: dist/CV Maker vX.Y.exe */
const path = require('path');
const builder = require('electron-builder');
const pkg = require('../package.json');

async function build() {
  const [major, minor] = pkg.version.split('.');
  const displayVersion = `${major}.${minor}`;
  const fileName = `CV Maker v${displayVersion}.exe`;
  await builder.build({
    targets: builder.Platform.WINDOWS.createTarget(['portable'], builder.Arch.x64),
    config: { ...pkg.build, portable: { artifactName: fileName } },
  });
  return { displayVersion, fileName, filePath: path.join(__dirname, '..', 'dist', fileName) };
}

module.exports = { build };
if (require.main === module) build().then((r) => console.log('Built', r.filePath)).catch((e) => { console.error(e); process.exit(1); });
