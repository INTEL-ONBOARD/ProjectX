const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, '_electron-log.txt');
const log = (msg) => fs.appendFileSync(logPath, msg + '\n');
log('=== START2 ===');

try {
  // Try electron/main internal path
  const { app, BrowserWindow, ipcMain } = require('electron/main');
  log('electron/main app: ' + typeof app);
  log('app.whenReady: ' + typeof app.whenReady);
  app.whenReady().then(() => {
    log('APP READY!');
    app.quit();
  });
} catch(e) {
  log('electron/main error: ' + e.message);
  try {
    const electron = require('electron');
    log('electron fallback type: ' + typeof electron);
  } catch(e2) {
    log('electron also failed: ' + e2.message);
  }
}
