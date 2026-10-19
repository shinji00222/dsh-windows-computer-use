// CI setup only: retry downloads, never retry or suppress regression failures.
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const installer = fileURLToPath(new URL('../node_modules/electron/install.js', import.meta.url));

export async function installElectron({
  run = spawnSync,
  pause = ms => new Promise(resolve => setTimeout(resolve, ms)),
  log = message => {
    process.stdout.write(message);
    if (process.env.WCU_ELECTRON_INSTALL_LOG) appendFileSync(process.env.WCU_ELECTRON_INSTALL_LOG, message);
  }
} = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    log(`Electron installation attempt ${attempt}/3\n`);
    const result = run(process.execPath, [installer], {
      encoding: 'utf8', windowsHide: true, timeout: 90000,
      maxBuffer: 4 * 1024 * 1024
    });
    if (result.stdout) log(result.stdout);
    if (result.stderr) log(result.stderr);
    if (result.error) log(`${result.error.stack || result.error}\n`);
    if (!result.error && result.status === 0) return;
    log(`Electron installer failed (exit ${result.status}, signal ${result.signal || 'none'}).\n`);
    if (attempt < 3) await pause(attempt * 5000);
  }
  throw new Error('Electron installation failed after 3 attempts. Regression tests have not run.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  installElectron().catch(error => {
    console.error(error.stack);
    process.exitCode = 1;
  });
}
