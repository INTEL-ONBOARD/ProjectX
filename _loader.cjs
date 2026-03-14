'use strict';

// Patch require to intercept 'electron' before main loads
const Module = require('module');
const origLoad = Module._load;

Module._load = function(request, parent, isMain) {
  if (request === 'electron') {
    // Try to load via the internal electron path
    // In Electron, the 'electron' module should be available as a builtin
    try {
      // Use the native binding directly
      return process.atomBinding ? process.atomBinding('app') : origLoad.call(this, request, parent, isMain);
    } catch (e) {
      return origLoad.call(this, request, parent, isMain);
    }
  }
  return origLoad.call(this, request, parent, isMain);
};

console.log('[loader] patched require, loading main...');
require('./dist-electron/main.js');
