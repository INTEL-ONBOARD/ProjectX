import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import dotenv from 'dotenv';
import mongoose, { Schema, Document } from 'mongoose';

// Load .env — try project root relative to this file
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

// ─── Mongoose Schemas ──────────────────────────────────────────────────────────

interface IUser extends Document {
    appId: string;
    name: string;
    avatar: string;
    email: string;
    location: string;
    role: 'admin' | 'manager' | 'member';
    designation: string;
    status: 'active' | 'inactive';
}

const UserSchema = new Schema<IUser>({
    appId: { type: String, required: true, unique: true },
    name: String,
    avatar: { type: String, default: '' },
    email: String,
    location: String,
    role: { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
    designation: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
});

interface ITask extends Document {
    appId: string;
    title: string;
    description: string;
    priority: 'low' | 'high' | 'completed';
    status: 'todo' | 'in-progress' | 'done';
    assignees: string[];
    comments: number;
    files: number;
    images: string[];
    dueDate: string;
    projectId: string;
}

const TaskSchema = new Schema<ITask>({
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

interface IProject extends Document {
    appId: string;
    name: string;
    color: string;
}

const ProjectSchema = new Schema<IProject>({
    appId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    color: { type: String, default: '#7AC555' },
});

interface IAttendance extends Document {
    recordId: string; // userId-date
    userId: string;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status: 'present' | 'absent' | 'half-day' | 'on-leave' | 'holiday' | 'wfh';
    notes?: string;
}

const AttendanceSchema = new Schema<IAttendance>({
    recordId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    date: { type: String, required: true },
    checkIn: String,
    checkOut: String,
    status: { type: String, enum: ['present', 'absent', 'half-day', 'on-leave', 'holiday', 'wfh'], default: 'present' },
    notes: String,
});

const UserModel = mongoose.model<IUser>('User', UserSchema);
const TaskModel = mongoose.model<ITask>('Task', TaskSchema);
const ProjectModel = mongoose.model<IProject>('Project', ProjectSchema);
const AttendanceModel = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

// ─── DB helpers: lean docs mapped to plain app objects ─────────────────────────

function toUser(doc: IUser) {
    return { id: doc.appId, name: doc.name, avatar: doc.avatar, email: doc.email, location: doc.location, role: doc.role, designation: doc.designation, status: doc.status };
}

function toProject(doc: IProject) {
    return { id: doc.appId, name: doc.name, color: doc.color, tasks: [] };
}

function toTask(doc: ITask) {
    return { id: doc.appId, title: doc.title, description: doc.description, priority: doc.priority, status: doc.status, assignees: doc.assignees, comments: doc.comments, files: doc.files, images: doc.images, dueDate: doc.dueDate, projectId: doc.projectId };
}

// ─── MongoDB connection ────────────────────────────────────────────────────────

async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://Vercel-Admin-atlas-bole-drum:VdbAV9Wt4XDKbNgs@atlas-bole-drum.81ktiub.mongodb.net/projectx?retryWrites=true&w=majority';
    if (!uri) {
        console.error('MONGODB_URI not set — running in offline mode');
        return;
    }
    try {
        await mongoose.connect(uri);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection failed:', err);
    }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerDbHandlers() {
    // ── Projects ──
    ipcMain.handle('db:projects:getAll', async () => {
        const docs = await ProjectModel.find();
        return docs.map(toProject);
    });

    ipcMain.handle('db:projects:create', async (_e, name: string, color: string) => {
        const appId = `p${Date.now()}`;
        const doc = await ProjectModel.create({ appId, name, color });
        return toProject(doc);
    });

    ipcMain.handle('db:projects:update', async (_e, id: string, changes: { name?: string; color?: string }) => {
        const doc = await ProjectModel.findOneAndUpdate({ appId: id }, changes, { new: true });
        return doc ? toProject(doc) : null;
    });

    ipcMain.handle('db:projects:delete', async (_e, id: string) => {
        await ProjectModel.deleteOne({ appId: id });
        await TaskModel.updateMany({ projectId: id }, { $unset: { projectId: '' } });
        return true;
    });

    // ── Tasks ──
    ipcMain.handle('db:tasks:getAll', async () => {
        const docs = await TaskModel.find();
        return docs.map(toTask);
    });

    ipcMain.handle('db:tasks:create', async (_e, taskData: Omit<ReturnType<typeof toTask>, 'id'>) => {
        const appId = `t${Date.now()}`;
        const doc = await TaskModel.create({ appId, ...taskData });
        return toTask(doc);
    });

    ipcMain.handle('db:tasks:update', async (_e, id: string, changes: Partial<Omit<ReturnType<typeof toTask>, 'id'>>) => {
        const doc = await TaskModel.findOneAndUpdate({ appId: id }, changes, { new: true });
        return doc ? toTask(doc) : null;
    });

    ipcMain.handle('db:tasks:delete', async (_e, id: string) => {
        await TaskModel.deleteOne({ appId: id });
        return true;
    });

    ipcMain.handle('db:tasks:move', async (_e, id: string, newStatus: string) => {
        const doc = await TaskModel.findOneAndUpdate({ appId: id }, { status: newStatus }, { new: true });
        return doc ? toTask(doc) : null;
    });

    ipcMain.handle('db:tasks:scrubAssignee', async (_e, memberId: string) => {
        await TaskModel.updateMany({ assignees: memberId }, { $pull: { assignees: memberId } });
        return true;
    });

    // ── Members ──
    ipcMain.handle('db:members:getAll', async () => {
        const docs = await UserModel.find();
        return docs.map(toUser);
    });

    ipcMain.handle('db:members:add', async (_e, member: Omit<ReturnType<typeof toUser>, 'id'>) => {
        const appId = `u${Date.now()}`;
        const doc = await UserModel.create({ appId, ...member });
        return toUser(doc);
    });

    ipcMain.handle('db:members:remove', async (_e, id: string) => {
        await UserModel.deleteOne({ appId: id });
        await TaskModel.updateMany({ assignees: id }, { $pull: { assignees: id } });
        return true;
    });

    // ── Attendance ──
    ipcMain.handle('db:attendance:getAll', async () => {
        const docs = await AttendanceModel.find();
        return docs.map(d => ({ id: d.recordId, userId: d.userId, date: d.date, checkIn: d.checkIn, checkOut: d.checkOut, status: d.status, notes: d.notes }));
    });

    ipcMain.handle('db:attendance:set', async (_e, record: { userId: string; date: string; status: string; checkIn?: string; checkOut?: string; notes?: string }) => {
        const recordId = `${record.userId}-${record.date}`;
        const doc = await AttendanceModel.findOneAndUpdate(
            { recordId },
            { recordId, ...record },
            { upsert: true, new: true }
        );
        return { id: doc!.recordId, userId: doc!.userId, date: doc!.date, checkIn: doc!.checkIn, checkOut: doc!.checkOut, status: doc!.status, notes: doc!.notes };
    });

    ipcMain.handle('db:attendance:delete', async (_e, userId: string, date: string) => {
        await AttendanceModel.deleteOne({ recordId: `${userId}-${date}` });
        return true;
    });
}

// ─── BrowserWindow ─────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

let autoUpdater: typeof import('electron-updater').autoUpdater | null = null;
if (!process.env.VITE_DEV_SERVER_URL) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        autoUpdater = require('electron-updater').autoUpdater;
    } catch {
        // electron-updater not available in dev
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1100,
        minHeight: 700,
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
        mainWindow?.show();
        if (autoUpdater) {
            setTimeout(() => checkForUpdates(), 3000);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function checkForUpdates() {
    if (!autoUpdater || !mainWindow) return;
    autoUpdater.checkForUpdates().catch((err) => {
        console.error('Update check failed:', err);
    });
}

function setupAutoUpdater() {
    if (!autoUpdater) return;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
        mainWindow?.webContents.send('update:checking');
    });
    autoUpdater.on('update-available', (info) => {
        mainWindow?.webContents.send('update:available', { version: info.version, releaseDate: info.releaseDate, releaseNotes: info.releaseNotes });
    });
    autoUpdater.on('update-not-available', () => {
        mainWindow?.webContents.send('update:not-available');
    });
    autoUpdater.on('download-progress', (progress) => {
        mainWindow?.webContents.send('update:download-progress', { percent: Math.round(progress.percent), transferred: progress.transferred, total: progress.total, bytesPerSecond: progress.bytesPerSecond });
    });
    autoUpdater.on('update-downloaded', (info) => {
        mainWindow?.webContents.send('update:downloaded', { version: info.version });
    });
    autoUpdater.on('error', (err) => {
        mainWindow?.webContents.send('update:error', err.message);
    });
}

// ─── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
    registerDbHandlers();
    ipcMain.handle('update:check', () => { checkForUpdates(); });
    ipcMain.handle('update:install', () => { if (autoUpdater) autoUpdater.quitAndInstall(false, true); });
    ipcMain.handle('app:version', () => app.getVersion());
    setupAutoUpdater();
    await connectDB();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
