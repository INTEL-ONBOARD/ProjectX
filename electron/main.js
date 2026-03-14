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

const MessageSchema = new Schema({
    msgId: { type: String, required: true, unique: true },
    fromId: { type: String, required: true },
    toId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: String, required: true },
    reactions: { type: Map, of: [String], default: {} },
    deleted: { type: Boolean, default: false },
});

const ConvMetaSchema = new Schema({
    convId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    peerId: { type: String, required: true },
    pinned: { type: Boolean, default: false },
    starred: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
});

const DeptSchema = new Schema({
    deptId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    color: { type: String, default: '#5030E5' },
    memberIds: [String],
});

const ProjectRichSchema = new Schema({
    projectId: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'on-hold', 'completed'], default: 'active' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    memberIds: [String],
    dueDate: { type: String, default: '' },
    starred: { type: Boolean, default: false },
    category: { type: String, default: 'General' },
});

const AuthUserSchema = new Schema({
    appId:    { type: String, required: true, unique: true },
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ['admin', 'manager', 'member'], default: 'member' },
});

const UserPrefSchema = new Schema({
    userId:            { type: String, required: true, unique: true },
    theme:             { type: String, enum: ['light', 'dark'], default: 'light' },
    sidebarCollapsed:  { type: Boolean, default: false },
    selectedWeekStart: { type: String, default: null },
    hasSeenWalkthrough:{ type: Boolean, default: false },
    projectsView:      { type: String, enum: ['grid', 'list'], default: 'grid' },
});

const NotifPrefSchema = new Schema({
    userId:         { type: String, required: true, unique: true },
    taskUpdates:    { type: Boolean, default: true },
    teamMentions:   { type: Boolean, default: true },
    weeklyDigest:   { type: Boolean, default: false },
    emailNotifs:    { type: Boolean, default: true },
    pushNotifs:     { type: Boolean, default: true },
    smsNotifs:      { type: Boolean, default: false },
    projectUpdates: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true },
    quietHours:     { type: Boolean, default: true },
});

const AppearancePrefSchema = new Schema({
    userId:      { type: String, required: true, unique: true },
    themeMode:   { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
    accentColor: { type: String, default: '#5030E5' },
    fontSize:    { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
    compactMode: { type: Boolean, default: false },
});

const AuthUserModel = mongoose.model('AuthUser', AuthUserSchema);
const UserPrefModel = mongoose.model('UserPref', UserPrefSchema);
const NotifPrefModel = mongoose.model('NotifPref', NotifPrefSchema);
const AppearancePrefModel = mongoose.model('AppearancePref', AppearancePrefSchema);
const UserModel = mongoose.model('User', UserSchema);
const TaskModel = mongoose.model('Task', TaskSchema);
const ProjectModel = mongoose.model('Project', ProjectSchema);
const AttendanceModel = mongoose.model('Attendance', AttendanceSchema);
const MessageModel = mongoose.model('Message', MessageSchema);
const ConvMetaModel = mongoose.model('ConvMeta', ConvMetaSchema);
const DeptModel = mongoose.model('Dept', DeptSchema);
const ProjectRichModel = mongoose.model('ProjectRich', ProjectRichSchema);

// ─── Helpers ───────────────────────────────────────────────────────────────────

const toUser = d => ({ id: d.appId, name: d.name, avatar: d.avatar ?? '', email: d.email ?? '', location: d.location ?? '', role: d.role, designation: d.designation ?? '', status: d.status });
const toProject = d => ({ id: d.appId, name: d.name, color: d.color, tasks: [] });
const toTask = d => ({ id: d.appId, title: d.title, description: d.description ?? '', priority: d.priority, status: d.status, assignees: Array.from(d.assignees ?? []), comments: d.comments ?? 0, files: d.files ?? 0, images: Array.from(d.images ?? []), dueDate: d.dueDate ?? null, projectId: d.projectId ?? null });

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
    ipcMain.handle('db:projects:getAll', async () => (await ProjectModel.find().lean()).map(toProject));
    ipcMain.handle('db:projects:create', async (_e, name, color) => { const d = await ProjectModel.create({ appId: `p${Date.now()}`, name, color }); return toProject(d.toObject()); });
    ipcMain.handle('db:projects:update', async (_e, id, changes) => { const d = await ProjectModel.findOneAndUpdate({ appId: id }, changes, { new: true }).lean(); return d ? toProject(d) : null; });
    ipcMain.handle('db:projects:delete', async (_e, id) => { await ProjectModel.deleteOne({ appId: id }); await TaskModel.updateMany({ projectId: id }, { $unset: { projectId: '' } }); return true; });

    ipcMain.handle('db:tasks:getAll', async () => (await TaskModel.find().lean()).map(toTask));
    ipcMain.handle('db:tasks:create', async (_e, taskData) => { const d = await TaskModel.create({ appId: `t${Date.now()}`, ...taskData }); return toTask(d.toObject()); });
    ipcMain.handle('db:tasks:update', async (_e, id, changes) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, changes, { new: true }).lean(); return d ? toTask(d) : null; });
    ipcMain.handle('db:tasks:delete', async (_e, id) => { await TaskModel.deleteOne({ appId: id }); return true; });
    ipcMain.handle('db:tasks:move', async (_e, id, newStatus) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, { status: newStatus }, { new: true }).lean(); return d ? toTask(d) : null; });
    ipcMain.handle('db:tasks:scrubAssignee', async (_e, memberId) => { await TaskModel.updateMany({ assignees: memberId }, { $pull: { assignees: memberId } }); return true; });

    ipcMain.handle('db:members:getAll', async () => (await UserModel.find().lean()).map(toUser));
    ipcMain.handle('db:members:add', async (_e, member) => { const d = await UserModel.create({ appId: `u${Date.now()}`, ...member }); return toUser(d.toObject()); });
    ipcMain.handle('db:members:update', async (_e, id, changes) => { const d = await UserModel.findOneAndUpdate({ appId: id }, changes, { new: true }).lean(); return d ? toUser(d) : null; });
    ipcMain.handle('db:members:remove', async (_e, id) => { await UserModel.deleteOne({ appId: id }); await TaskModel.updateMany({ assignees: id }, { $pull: { assignees: id } }); return true; });

    ipcMain.handle('db:attendance:getAll', async () => (await AttendanceModel.find().lean()).map(d => ({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null })));
    ipcMain.handle('db:attendance:set', async (_e, record) => {
        const recordId = `${record.userId}-${record.date}`;
        const d = await AttendanceModel.findOneAndUpdate({ recordId }, { recordId, ...record }, { upsert: true, new: true }).lean();
        return { id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null };
    });
    ipcMain.handle('db:attendance:delete', async (_e, userId, date) => { await AttendanceModel.deleteOne({ recordId: `${userId}-${date}` }); return true; });

    // Messages
    const toMsg = d => ({ id: d.msgId, fromId: d.fromId, toId: d.toId, text: d.text, timestamp: d.timestamp, reactions: Object.fromEntries(d.reactions ?? new Map()), deleted: d.deleted ?? false });

    ipcMain.handle('db:messages:getBetween', async (_e, userId, peerId) => {
        const msgs = await MessageModel.find({ $or: [{ fromId: userId, toId: peerId }, { fromId: peerId, toId: userId }] }).sort({ timestamp: 1 }).lean();
        return msgs.map(toMsg);
    });
    ipcMain.handle('db:messages:send', async (_e, msg) => {
        const d = await MessageModel.create({ msgId: `m${Date.now()}`, ...msg });
        return toMsg(d.toObject());
    });
    ipcMain.handle('db:messages:react', async (_e, msgId, userId, emoji) => {
        const msg = await MessageModel.findOne({ msgId }).lean();
        if (!msg) return null;
        const reactions = new Map(Object.entries(msg.reactions ?? {}));
        const users = reactions.get(emoji) ?? [];
        if (users.includes(userId)) reactions.set(emoji, users.filter(u => u !== userId));
        else reactions.set(emoji, [...users, userId]);
        const d = await MessageModel.findOneAndUpdate({ msgId }, { reactions }, { new: true }).lean();
        return d ? toMsg(d) : null;
    });
    ipcMain.handle('db:messages:delete', async (_e, msgId) => {
        await MessageModel.findOneAndUpdate({ msgId }, { deleted: true });
        return true;
    });

    // Conv meta (pin/star/archive)
    const toConvMeta = d => ({ convId: d.convId, userId: d.userId, peerId: d.peerId, pinned: d.pinned ?? false, starred: d.starred ?? false, archived: d.archived ?? false });

    ipcMain.handle('db:convmeta:getAll', async (_e, userId) => {
        const docs = await ConvMetaModel.find({ userId }).lean();
        return docs.map(toConvMeta);
    });
    ipcMain.handle('db:convmeta:set', async (_e, meta) => {
        const convId = `${meta.userId}-${meta.peerId}`;
        const d = await ConvMetaModel.findOneAndUpdate({ convId }, { convId, ...meta }, { upsert: true, new: true }).lean();
        return toConvMeta(d);
    });

    // Departments
    const toDept = d => ({ id: d.deptId, name: d.name, color: d.color, memberIds: Array.from(d.memberIds ?? []) });

    ipcMain.handle('db:depts:getAll', async () => (await DeptModel.find().lean()).map(toDept));
    ipcMain.handle('db:depts:create', async (_e, dept) => { const d = await DeptModel.create({ deptId: `dept${Date.now()}`, ...dept }); return toDept(d.toObject()); });
    ipcMain.handle('db:depts:update', async (_e, id, changes) => { const d = await DeptModel.findOneAndUpdate({ deptId: id }, changes, { new: true }).lean(); return d ? toDept(d) : null; });
    ipcMain.handle('db:depts:delete', async (_e, id) => { await DeptModel.deleteOne({ deptId: id }); return true; });

    // Project rich data
    const toProjectRich = d => ({ projectId: d.projectId, description: d.description ?? '', status: d.status, priority: d.priority, memberIds: Array.from(d.memberIds ?? []), dueDate: d.dueDate ?? '', starred: d.starred ?? false, category: d.category ?? 'General' });

    ipcMain.handle('db:projectrich:getAll', async () => (await ProjectRichModel.find().lean()).map(toProjectRich));
    ipcMain.handle('db:projectrich:set', async (_e, data) => {
        const d = await ProjectRichModel.findOneAndUpdate({ projectId: data.projectId }, data, { upsert: true, new: true }).lean();
        return toProjectRich(d);
    });

    // Auth — credentials stored in MongoDB, password in plaintext (no backend hashing available in Electron main)
    const toAuthUser = d => ({ id: d.appId, name: d.name, email: d.email, role: d.role });

    ipcMain.handle('db:auth:login', async (_e, email, password) => {
        const found = await AuthUserModel.findOne({ email: email.toLowerCase() }).lean();
        if (!found || found.password !== password) throw new Error('Invalid email or password.');
        return toAuthUser(found);
    });

    ipcMain.handle('db:auth:register', async (_e, name, email, password, role) => {
        const existing = await AuthUserModel.findOne({ email: email.toLowerCase() }).lean();
        if (existing) throw new Error('An account with this email already exists.');
        const d = await AuthUserModel.create({ appId: `auth-${Date.now()}`, name, email: email.toLowerCase(), password, role });
        return toAuthUser(d.toObject());
    });

    ipcMain.handle('db:auth:updatePassword', async (_e, userId, currentPassword, newPassword) => {
        const found = await AuthUserModel.findOne({ appId: userId }).lean();
        if (!found || found.password !== currentPassword) throw new Error('Current password is incorrect.');
        await AuthUserModel.findOneAndUpdate({ appId: userId }, { password: newPassword });
        return true;
    });

    ipcMain.handle('db:auth:updateName', async (_e, userId, newName) => {
        await AuthUserModel.findOneAndUpdate({ appId: userId }, { name: newName });
        return true;
    });

    ipcMain.handle('db:auth:seedDefault', async () => {
        const existing = await AuthUserModel.findOne({ email: 'admin@projectm.com' }).lean();
        if (!existing) {
            await AuthUserModel.create({ appId: 'auth-default', name: 'Admin User', email: 'admin@projectm.com', password: 'password123', role: 'admin' });
        }
    });

    // User preferences (theme, sidebar, week start, walkthrough, view)
    const toUserPref = d => ({
        userId: d.userId, theme: d.theme, sidebarCollapsed: d.sidebarCollapsed ?? false,
        selectedWeekStart: d.selectedWeekStart ?? null, hasSeenWalkthrough: d.hasSeenWalkthrough ?? false,
        projectsView: d.projectsView ?? 'grid',
    });
    ipcMain.handle('db:userpref:get', async (_e, userId) => {
        const d = await UserPrefModel.findOne({ userId }).lean();
        return d ? toUserPref(d) : null;
    });
    ipcMain.handle('db:userpref:set', async (_e, prefs) => {
        const d = await UserPrefModel.findOneAndUpdate({ userId: prefs.userId }, prefs, { upsert: true, new: true }).lean();
        return toUserPref(d);
    });

    // Notification preferences
    const toNotifPref = d => ({
        userId: d.userId, taskUpdates: d.taskUpdates, teamMentions: d.teamMentions,
        weeklyDigest: d.weeklyDigest, emailNotifs: d.emailNotifs, pushNotifs: d.pushNotifs,
        smsNotifs: d.smsNotifs, projectUpdates: d.projectUpdates, securityAlerts: d.securityAlerts,
        quietHours: d.quietHours,
    });
    ipcMain.handle('db:notifpref:get', async (_e, userId) => {
        const d = await NotifPrefModel.findOne({ userId }).lean();
        return d ? toNotifPref(d) : null;
    });
    ipcMain.handle('db:notifpref:set', async (_e, prefs) => {
        const d = await NotifPrefModel.findOneAndUpdate({ userId: prefs.userId }, prefs, { upsert: true, new: true }).lean();
        return toNotifPref(d);
    });

    // Appearance preferences
    const toAppearancePref = d => ({
        userId: d.userId, themeMode: d.themeMode, accentColor: d.accentColor,
        fontSize: d.fontSize, compactMode: d.compactMode ?? false,
    });
    ipcMain.handle('db:appearancepref:get', async (_e, userId) => {
        const d = await AppearancePrefModel.findOne({ userId }).lean();
        return d ? toAppearancePref(d) : null;
    });
    ipcMain.handle('db:appearancepref:set', async (_e, prefs) => {
        const d = await AppearancePrefModel.findOneAndUpdate({ userId: prefs.userId }, prefs, { upsert: true, new: true }).lean();
        return toAppearancePref(d);
    });
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
