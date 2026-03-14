const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  const result = originalRequire.call(this, id);
  if (id === 'electron') {
    console.log('electron required, type:', typeof result, 'keys:', typeof result === 'object' ? Object.keys(result || {}).slice(0, 5) : result);
  }
  return result;
};

// Now load main
require('./dist-electron/main.js');
