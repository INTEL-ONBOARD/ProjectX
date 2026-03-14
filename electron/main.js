'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const mongoose = require('mongoose');

// ─── Mongoose Schemas ──────────────────────────────────────────────────────────

const { Schema } = mongoose;

const UserSchema = new Schema({
    appId: { type: String, required: true, unique: true },
    name: String,
    avatar: { type: String, default: '' },
    email: String,
    location: String,
    role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
    designation: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
});

const TaskSchema = new Schema({
    appId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'high', 'completed'], default: 'low' },
    status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
    assignees: [String],
    comments: { type: Number, default: 0 },
    files: { type: Number, default: 0 },
    images: [String],
    dueDate: String,
    projectId: String,
});

const ProjectSchema = new Schema({
    appId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    color: { type: String, default: '#7AC555' },
});

const AttendanceSchema = new Schema({
    recordId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    date: { type: String, required: true },
    checkIn: String,
    checkOut: String,
    status: { type: String, enum: ['present', 'absent', 'half-day', 'on-leave', 'holiday', 'wfh'], default: 'present' },
    notes: String,
});

const UserModel = mongoose.model('User', UserSchema);
const TaskModel = mongoose.model('Task', TaskSchema);
const ProjectModel = mongoose.model('Project', ProjectSchema);
const AttendanceModel = mongoose.model('Attendance', AttendanceSchema);

// ─── Helpers ───────────────────────────────────────────────────────────────────

const toUser = d => ({ id: d.appId, name: d.name, avatar: d.avatar, email: d.email, location: d.location, role: d.role, designation: d.designation, status: d.status });
const toProject = d => ({ id: d.appId, name: d.name, color: d.color, tasks: [] });
const toTask = d => ({ id: d.appId, title: d.title, description: d.description, priority: d.priority, status: d.status, assignees: d.assignees, comments: d.comments, files: d.files, images: d.images, dueDate: d.dueDate, projectId: d.projectId });

// ─── MongoDB connection ────────────────────────────────────────────────────────

async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://Vercel-Admin-atlas-bole-drum:VdbAV9Wt4XDKbNgs@atlas-bole-drum.81ktiub.mongodb.net/projectx?retryWrites=true&w=majority';
    if (!uri) { console.error('MONGODB_URI not set'); return; }
    try {
        await mongoose.connect(uri);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection failed:', err);
    }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerDbHandlers() {
    ipcMain.handle('db:projects:getAll', async () => (await ProjectModel.find()).map(toProject));
    ipcMain.handle('db:projects:create', async (_e, name, color) => toProject(await ProjectModel.create({ appId: `p${Date.now()}`, name, color })));
    ipcMain.handle('db:projects:update', async (_e, id, changes) => { const d = await ProjectModel.findOneAndUpdate({ appId: id }, changes, { new: true }); return d ? toProject(d) : null; });
    ipcMain.handle('db:projects:delete', async (_e, id) => { await ProjectModel.deleteOne({ appId: id }); await TaskModel.updateMany({ projectId: id }, { $unset: { projectId: '' } }); return true; });

    ipcMain.handle('db:tasks:getAll', async () => (await TaskModel.find()).map(toTask));
    ipcMain.handle('db:tasks:create', async (_e, taskData) => toTask(await TaskModel.create({ appId: `t${Date.now()}`, ...taskData })));
    ipcMain.handle('db:tasks:update', async (_e, id, changes) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, changes, { new: true }); return d ? toTask(d) : null; });
    ipcMain.handle('db:tasks:delete', async (_e, id) => { await TaskModel.deleteOne({ appId: id }); return true; });
    ipcMain.handle('db:tasks:move', async (_e, id, newStatus) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, { status: newStatus }, { new: true }); return d ? toTask(d) : null; });
    ipcMain.handle('db:tasks:scrubAssignee', async (_e, memberId) => { await TaskModel.updateMany({ assignees: memberId }, { $pull: { assignees: memberId } }); return true; });

    ipcMain.handle('db:members:getAll', async () => (await UserModel.find()).map(toUser));
    ipcMain.handle('db:members:add', async (_e, member) => toUser(await UserModel.create({ appId: `u${Date.now()}`, ...member })));
    ipcMain.handle('db:members:remove', async (_e, id) => { await UserModel.deleteOne({ appId: id }); await TaskModel.updateMany({ assignees: id }, { $pull: { assignees: id } }); return true; });

    ipcMain.handle('db:attendance:getAll', async () => (await AttendanceModel.find()).map(d => ({ id: d.recordId, userId: d.userId, date: d.date, checkIn: d.checkIn, checkOut: d.checkOut, status: d.status, notes: d.notes })));
    ipcMain.handle('db:attendance:set', async (_e, record) => {
        const recordId = `${record.userId}-${record.date}`;
        const d = await AttendanceModel.findOneAndUpdate({ recordId }, { recordId, ...record }, { upsert: true, new: true });
        return { id: d.recordId, userId: d.userId, date: d.date, checkIn: d.checkIn, checkOut: d.checkOut, status: d.status, notes: d.notes };
    });
    ipcMain.handle('db:attendance:delete', async (_e, userId, date) => { await AttendanceModel.deleteOne({ recordId: `${userId}-${date}` }); return true; });
}

// ─── Auto Updater ─────────────────────────────────────────────────────────────

let mainWindow = null;
let autoUpdater = null;

if (!process.env.VITE_DEV_SERVER_URL) {
    try { autoUpdater = require('electron-updater').autoUpdater; } catch {}
}

function checkForUpdates() {
    if (!autoUpdater || !mainWindow) return;
    autoUpdater.checkForUpdates().catch(err => console.error('Update check failed:', err));
}

function setupAutoUpdater() {
    if (!autoUpdater) return;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('checking-for-update', () => mainWindow?.webContents.send('update:checking'));
    autoUpdater.on('update-available', info => mainWindow?.webContents.send('update:available', { version: info.version, releaseDate: info.releaseDate, releaseNotes: info.releaseNotes }));
    autoUpdater.on('update-not-available', () => mainWindow?.webContents.send('update:not-available'));
    autoUpdater.on('download-progress', p => mainWindow?.webContents.send('update:download-progress', { percent: Math.round(p.percent), transferred: p.transferred, total: p.total, bytesPerSecond: p.bytesPerSecond }));
    autoUpdater.on('update-downloaded', info => mainWindow?.webContents.send('update:downloaded', { version: info.version }));
    autoUpdater.on('error', err => mainWindow?.webContents.send('update:error', err.message));
}

// ─── Window ────────────────────────────────────────────────────────────────────

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, height: 900, minWidth: 1100, minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 15, y: 15 },
        backgroundColor: '#F5F5F5',
        show: false,
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (autoUpdater) setTimeout(() => checkForUpdates(), 3000);
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
    registerDbHandlers();
    ipcMain.handle('update:check', () => checkForUpdates());
    ipcMain.handle('update:install', () => { if (autoUpdater) autoUpdater.quitAndInstall(false, true); });
    ipcMain.handle('app:version', () => app.getVersion());
    setupAutoUpdater();
    await connectDB();
    createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
