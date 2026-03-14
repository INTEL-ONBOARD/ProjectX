const { app, BrowserWindow } = require('electron');
console.log('process.type:', process.type);
app.whenReady().then(() => {
  console.log('ready!');
  app.quit();
});
