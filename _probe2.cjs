const Module = require('module');
const orig = Module._resolveFilename;
Module._resolveFilename = function(req, parent, isMain, opts) {
  try {
    const result = orig.call(this, req, parent, isMain, opts);
    if (req === 'electron' || req.startsWith('electron/')) {
      const fs = require('fs');
      fs.appendFileSync('/Users/kkwenuja/Desktop/ProjectX/_probe-log.txt', `resolve(${req}) = ${result}\n`);
    }
    return result;
  } catch(e) {
    if (req === 'electron' || req.startsWith('electron/')) {
      const fs = require('fs');
      fs.appendFileSync('/Users/kkwenuja/Desktop/ProjectX/_probe-log.txt', `resolve(${req}) FAILED: ${e.message}\n`);
    }
    throw e;
  }
};

const fs = require('fs');
fs.appendFileSync('/Users/kkwenuja/Desktop/ProjectX/_probe-log.txt', '=PROBE2 START=\nprocess.type:' + process.type + '\n');

// Now try to load main
require('./electron/main.js');
