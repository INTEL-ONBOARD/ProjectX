console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);
const e = require('electron');
console.log('require electron type:', typeof e, '=', JSON.stringify(e));
