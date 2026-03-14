const fs = require('fs');
const path = require('path');
const logPath = path.join(__dirname, '_electron-log.txt');
const log = (msg) => fs.appendFileSync(logPath, msg + '\n');

log('=== START ===');
log('process.type: ' + process.type);
log('__dirname: ' + __dirname);
try {
  const electron = require('electron');
  log('electron type: ' + typeof electron);
  if (typeof electron === 'object' && electron !== null) {
    log('electron keys: ' + Object.keys(electron).join(', '));
  } else {
    log('electron value: ' + String(electron));
  }
} catch(e) {
  log('electron require error: ' + e.message);
}
log('=== END ===');
