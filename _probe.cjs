const Module = require('module');

// Check if 'electron' is already registered as a builtin
console.log('builtinModules includes electron:', Module.builtinModules && Module.builtinModules.includes('electron'));

// Check _cache
const keys = Object.keys(require.cache).filter(k => k.includes('electron'));
console.log('require.cache electron entries:', keys.slice(0, 5));

// Check if we can access it via __binding
try {
  const b = process.binding('atom_browser_app');
  console.log('atom_browser_app:', typeof b);
} catch(e) { console.log('no atom_browser_app:', e.message.slice(0, 50)); }

// Check _resolveFilename for electron
try {
  const resolved = Module._resolveFilename('electron', null, false);
  console.log('resolved electron:', resolved);
} catch(e) { console.log('_resolveFilename error:', e.message.slice(0, 80)); }

// Check if we can require it via alternative paths  
try {
  const e2 = require('electron/js2c/browser_init');
  console.log('browser_init:', typeof e2);
} catch(e) { console.log('browser_init error:', e.message.slice(0, 80)); }
