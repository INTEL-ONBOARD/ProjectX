"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
// ─── Mongoose Schemas ──────────────────────────────────────────────────────────
const UserSchema = new mongoose_1.Schema({
    appId: { type: String, required: true, unique: true },
    name: String,
    avatar: { type: String, default: '' },
    email: String,
    location: String,
    role: { type: String, default: 'member' },
    designation: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastSeen: { type: Date, default: null },
});
const TaskSchema = new mongoose_1.Schema({
    appId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'high', 'completed'], default: 'low' },
    status: { type: String, enum: ['todo', 'in-progress', 'ready-for-qa', 'deployment-pending', 'blocker', 'done'], default: 'todo' },
    assignees: [String],
    comments: { type: Number, default: 0 },
    files: { type: Number, default: 0 },
    images: [String],
    dueDate: String,
    projectId: String,
    activity: { type: Array, default: [] },
});
const ProjectSchema = new mongoose_1.Schema({
    appId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    color: { type: String, default: '#7AC555' },
});
const AttendanceSchema = new mongoose_1.Schema({
    recordId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    date: { type: String, required: true },
    checkIn: String,
    checkOut: String,
    status: { type: String, enum: ['present', 'absent', 'half-day', 'on-leave', 'holiday', 'wfh'], default: 'present' },
    notes: String,
});
const MessageSchema = new mongoose_1.Schema({
    msgId: { type: String, required: true, unique: true },
    fromId: { type: String, required: true },
    toId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: String, required: true },
    reactions: { type: Map, of: [String], default: {} },
    deleted: { type: Boolean, default: false },
});
const ConvMetaSchema = new mongoose_1.Schema({
    convId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    peerId: { type: String, required: true },
    pinned: { type: Boolean, default: false },
    starred: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
});
const DeptSchema = new mongoose_1.Schema({
    deptId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    color: { type: String, default: '#5030E5' },
    memberIds: [String],
});
const ProjectRichSchema = new mongoose_1.Schema({
    projectId: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'on-hold', 'completed'], default: 'active' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    memberIds: [String],
    dueDate: { type: String, default: '' },
    starred: { type: Boolean, default: false },
    category: { type: String, default: 'General' },
});
const AuthUserSchema = new mongoose_1.Schema({
    appId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'member' },
});
const UserPrefSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, unique: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    sidebarCollapsed: { type: Boolean, default: false },
    selectedWeekStart: { type: String, default: null },
    hasSeenWalkthrough: { type: Boolean, default: false },
    projectsView: { type: String, enum: ['grid', 'list'], default: 'grid' },
    taskBreakdownSnapshot: { type: mongoose_1.Schema.Types.Mixed, default: {} },
});
const NotifPrefSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, unique: true },
    taskUpdates: { type: Boolean, default: true },
    teamMentions: { type: Boolean, default: true },
    weeklyDigest: { type: Boolean, default: false },
    emailNotifs: { type: Boolean, default: true },
    pushNotifs: { type: Boolean, default: true },
    smsNotifs: { type: Boolean, default: false },
    projectUpdates: { type: Boolean, default: true },
    securityAlerts: { type: Boolean, default: true },
    quietHours: { type: Boolean, default: true },
});
const NotificationSchema = new mongoose_1.Schema({
    notifId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    type: { type: String, enum: ['task_overdue', 'task_assigned', 'new_message'], required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    refId: { type: String, default: '' },
    read: { type: Boolean, default: false },
    createdAt: { type: String, required: true },
});
const AppearancePrefSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, unique: true },
    themeMode: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
    accentColor: { type: String, default: '#5030E5' },
    fontSize: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
    compactMode: { type: Boolean, default: false },
});
const OrgSchema = new mongoose_1.Schema({
    orgId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    logo: { type: String, default: '' },
    address: { type: String, default: '' },
    workStart: { type: String, default: '09:00' },
    workEnd: { type: String, default: '18:00' },
    createdAt: { type: String, default: () => new Date().toISOString() },
});
const RolePermsSchema = new mongoose_1.Schema({
    role: { type: String, required: true, unique: true },
    allowedRoutes: { type: [String], default: [] },
});
const UserModel = mongoose_1.default.model('User', UserSchema);
const TaskModel = mongoose_1.default.model('Task', TaskSchema);
const ProjectModel = mongoose_1.default.model('Project', ProjectSchema);
const AttendanceModel = mongoose_1.default.model('Attendance', AttendanceSchema);
const MessageModel = mongoose_1.default.model('Message', MessageSchema);
const ConvMetaModel = mongoose_1.default.model('ConvMeta', ConvMetaSchema);
const DeptModel = mongoose_1.default.model('Dept', DeptSchema);
const ProjectRichModel = mongoose_1.default.model('ProjectRich', ProjectRichSchema);
const AuthUserModel = mongoose_1.default.model('AuthUser', AuthUserSchema);
const UserPrefModel = mongoose_1.default.model('UserPref', UserPrefSchema);
const NotifPrefModel = mongoose_1.default.model('NotifPref', NotifPrefSchema);
const NotificationModel = mongoose_1.default.model('Notification', NotificationSchema);
const AppearancePrefModel = mongoose_1.default.model('AppearancePref', AppearancePrefSchema);
const OrgModel = mongoose_1.default.model('Org', OrgSchema);
const RolePermsModel = mongoose_1.default.model('RolePerms', RolePermsSchema);
const RoleSchema = new mongoose_1.Schema({
    appId: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    color: { type: String, default: '#9CA3AF' },
});
const RoleModel = mongoose_1.default.model('Role', RoleSchema);
// ─── Helpers ───────────────────────────────────────────────────────────────────
// Safe serialization — strips Mongoose internals before IPC transfer
const safe = (v) => JSON.parse(JSON.stringify(v));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toUser = (d) => ({ id: d.appId, name: d.name, avatar: d.avatar ?? '', email: d.email ?? '', location: d.location ?? '', role: d.role, designation: d.designation ?? '', status: d.status, lastSeen: d.lastSeen?.toISOString() ?? null });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProject = (d) => ({ id: d.appId, name: d.name, color: d.color, tasks: [] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toTask = (d) => ({ id: d.appId, title: d.title, description: d.description ?? '', priority: d.priority, status: d.status, assignees: (d.assignees ?? []).map(String), comments: d.comments ?? 0, files: d.files ?? 0, images: (d.images ?? []).map(String), dueDate: d.dueDate ?? null, projectId: d.projectId ?? null, activity: d.activity ?? [] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toAuthUser = (d) => ({ id: d.appId, name: d.name, email: d.email, role: d.role });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDept = (d) => ({ id: d.deptId, name: d.name, color: d.color, memberIds: (d.memberIds ?? []).map(String) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProjectRich = (d) => ({ projectId: d.projectId, description: d.description ?? '', status: d.status, priority: d.priority, memberIds: Array.from(d.memberIds ?? []), dueDate: d.dueDate ?? '', starred: d.starred ?? false, category: d.category ?? 'General' });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMsg = (d) => ({ id: d.msgId, fromId: d.fromId, toId: d.toId, text: d.text, timestamp: d.timestamp, reactions: d.reactions ? Object.fromEntries(Object.entries(d.reactions)) : {}, deleted: d.deleted ?? false });
// Produces renderer-compatible shape (from/to/time) for IPC push events
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMsgFrontend = (d) => ({
    id: d.msgId,
    from: d.fromId,
    to: d.toId,
    text: d.text,
    time: d.timestamp,
    read: d.read ?? false,
    reactions: d.reactions ? Object.fromEntries(Object.entries(d.reactions)) : {},
    deleted: d.deleted ?? false,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toConvMeta = (d) => ({ convId: d.convId, userId: d.userId, peerId: d.peerId, pinned: d.pinned ?? false, starred: d.starred ?? false, archived: d.archived ?? false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toOrg = (d) => ({ id: d.orgId, name: d.name, logo: d.logo ?? '', address: d.address ?? '', workStart: d.workStart ?? '09:00', workEnd: d.workEnd ?? '18:00', createdAt: d.createdAt ?? '' });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toUserPref = (d) => ({ userId: d.userId, theme: d.theme, sidebarCollapsed: d.sidebarCollapsed ?? false, selectedWeekStart: d.selectedWeekStart ?? null, hasSeenWalkthrough: d.hasSeenWalkthrough ?? false, projectsView: d.projectsView ?? 'grid', taskBreakdownSnapshot: d.taskBreakdownSnapshot ?? {} });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toNotifPref = (d) => ({ userId: d.userId, taskUpdates: d.taskUpdates, teamMentions: d.teamMentions, weeklyDigest: d.weeklyDigest, emailNotifs: d.emailNotifs, pushNotifs: d.pushNotifs, smsNotifs: d.smsNotifs, projectUpdates: d.projectUpdates, securityAlerts: d.securityAlerts, quietHours: d.quietHours });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toAppearancePref = (d) => ({ userId: d.userId, themeMode: d.themeMode, accentColor: d.accentColor, fontSize: d.fontSize, compactMode: d.compactMode ?? false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toNotif = (d) => ({ id: d.notifId, userId: d.userId, type: d.type, title: d.title, body: d.body ?? '', refId: d.refId ?? '', read: d.read ?? false, createdAt: d.createdAt });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toRole = (d) => ({ appId: d.appId, name: d.name, color: d.color ?? '#9CA3AF' });
// ─── MongoDB connection ────────────────────────────────────────────────────────
let mainWindow = null;
let messageStream = null;
function startMessageStream() {
    if (messageStream) {
        try {
            messageStream.close();
        }
        catch (_) { }
        messageStream = null;
    }
    try {
        messageStream = MessageModel.watch([{ $match: { operationType: 'insert' } }]);
        messageStream.on('change', (change) => {
            if (!mainWindow || mainWindow.isDestroyed())
                return;
            const d = change.fullDocument;
            if (!d)
                return;
            mainWindow.webContents.send('msg:new', toMsgFrontend(d));
        });
        messageStream.on('error', (err) => {
            console.error('[changeStream] error:', err.message);
            try {
                messageStream.close();
            }
            catch (_) { }
            messageStream = null;
            setTimeout(() => {
                if (mongoose_1.default.connection.readyState === 1)
                    startMessageStream();
            }, 5000);
        });
        console.log('[changeStream] message stream started');
    }
    catch (err) {
        console.error('[changeStream] failed to start:', err.message);
    }
}
async function ensureDefaultData() {
    // Ensure Toursurv org exists
    const orgExists = await OrgModel.findOne({ orgId: 'org-toursurv' }).lean();
    if (!orgExists) {
        await OrgModel.create({ orgId: 'org-toursurv', name: 'Toursurv', workStart: '09:00', workEnd: '18:00', createdAt: new Date().toISOString() });
        console.log('Seeded default org: Toursurv');
    }
    // Backfill orgId on any existing users that don't have one
    await AuthUserModel.updateMany({ orgId: { $exists: false } }, { $set: { orgId: 'org-toursurv' } });
    await UserModel.updateMany({ orgId: { $exists: false } }, { $set: { orgId: 'org-toursurv' } });
}
async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://Vercel-Admin-atlas-bole-drum:VdbAV9Wt4XDKbNgs@atlas-bole-drum.81ktiub.mongodb.net/projectx?retryWrites=true&w=majority';
    if (!uri) {
        console.error('MONGODB_URI not set');
        return;
    }
    const opts = { serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000, socketTimeoutMS: 45000 };
    // Listen for mongoose disconnect/reconnect events once
    mongoose_1.default.connection.once('connected', () => { });
    mongoose_1.default.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        if (mainWindow)
            mainWindow.webContents.send('db:disconnected');
    });
    mongoose_1.default.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
        if (mainWindow)
            mainWindow.webContents.send('db:reconnected');
    });
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            await mongoose_1.default.connect(uri, opts);
            console.log('MongoDB connected');
            if (mainWindow)
                mainWindow.webContents.send('db:connected');
            await ensureDefaultData();
            return;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`MongoDB connection attempt ${attempt} failed:`, msg);
            if (attempt < 5) {
                const delay = attempt * 3000;
                console.log(`Retrying in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            }
            else {
                console.error('MongoDB connection failed after 5 attempts.');
                if (mainWindow)
                    mainWindow.webContents.send('db:connection-failed', msg);
            }
        }
    }
}
// ─── IPC Handlers ─────────────────────────────────────────────────────────────
function registerDbHandlers() {
    // Projects
    electron_1.ipcMain.handle('db:projects:getAll', async () => safe((await ProjectModel.find().lean()).map(toProject)));
    electron_1.ipcMain.handle('db:projects:create', async (_e, name, color) => { const d = await ProjectModel.create({ appId: `p${Date.now()}`, name, color }); return safe(toProject(d.toObject())); });
    electron_1.ipcMain.handle('db:projects:update', async (_e, id, changes) => { const d = await ProjectModel.findOneAndUpdate({ appId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toProject(d)) : null; });
    electron_1.ipcMain.handle('db:projects:delete', async (_e, id) => { await ProjectModel.deleteOne({ appId: id }); await TaskModel.updateMany({ projectId: id }, { $unset: { projectId: '' } }); return true; });
    // Tasks
    electron_1.ipcMain.handle('db:tasks:getAll', async () => safe((await TaskModel.find().lean()).map(toTask)));
    electron_1.ipcMain.handle('db:tasks:create', async (_e, taskData) => {
        const { actorId, actorName, ...rest } = taskData;
        const entry = {
            id: crypto.randomUUID(),
            type: 'created',
            actorId: actorId ?? 'system',
            actorName: actorName ?? 'System',
            timestamp: new Date().toISOString(),
        };
        const doc = await TaskModel.create({ appId: 't' + Date.now(), ...rest, activity: [entry] });
        return safe(toTask(doc.toObject()));
    });
    electron_1.ipcMain.handle('db:tasks:update', async (_e, id, changes) => {
        const { actorId, actorName, ...rest } = changes;
        const actor = { actorId: actorId ?? 'system', actorName: actorName ?? 'System' };
        const current = await TaskModel.findOne({ appId: id }).lean();
        if (!current)
            return null;
        const entries = [];
        const ts = new Date().toISOString();
        const scalarFields = [
            ['status', 'status_changed'], ['priority', 'priority_changed'],
            ['dueDate', 'due_date_changed'], ['title', 'title_changed'],
            ['description', 'description_changed'],
        ];
        for (const [field, type] of scalarFields) {
            if (rest[field] !== undefined && String(rest[field]) !== String(current[field] ?? '')) {
                entries.push({ id: crypto.randomUUID(), type, ...actor, timestamp: ts, from: String(current[field] ?? ''), to: String(rest[field]) });
            }
        }
        if (rest.assignees !== undefined) {
            const oldSet = new Set(current.assignees ?? []);
            const newSet = new Set(rest.assignees);
            for (const a of newSet) {
                if (!oldSet.has(a))
                    entries.push({ id: crypto.randomUUID(), type: 'assignee_added', ...actor, timestamp: ts, to: a });
            }
            for (const a of oldSet) {
                if (!newSet.has(a))
                    entries.push({ id: crypto.randomUUID(), type: 'assignee_removed', ...actor, timestamp: ts, from: a });
            }
        }
        const updateDoc = { $set: { ...rest } };
        if (entries.length > 0)
            updateDoc.$push = { activity: { $each: entries } };
        const updated = await TaskModel.findOneAndUpdate({ appId: id }, updateDoc, { returnDocument: 'after' });
        return updated ? safe(toTask(updated.toObject())) : null;
    });
    electron_1.ipcMain.handle('db:tasks:delete', async (_e, id) => { await TaskModel.deleteOne({ appId: id }); return true; });
    electron_1.ipcMain.handle('db:tasks:move', async (_e, id, newStatus, actorId, actorName) => {
        const current = await TaskModel.findOne({ appId: id }).lean();
        if (!current)
            return null;
        const entry = {
            id: crypto.randomUUID(),
            type: 'status_changed',
            actorId: actorId ?? 'system',
            actorName: actorName ?? 'System',
            timestamp: new Date().toISOString(),
            from: current.status,
            to: newStatus,
        };
        const updated = await TaskModel.findOneAndUpdate({ appId: id }, { $set: { status: newStatus }, $push: { activity: entry } }, { returnDocument: 'after' });
        return updated ? safe(toTask(updated.toObject())) : null;
    });
    electron_1.ipcMain.handle('db:tasks:scrubAssignee', async (_e, memberId) => { await TaskModel.updateMany({ assignees: memberId }, { $pull: { assignees: memberId } }); return true; });
    // Members
    electron_1.ipcMain.handle('db:members:getAll', async () => safe((await UserModel.find().lean()).map(toUser)));
    electron_1.ipcMain.handle('db:members:add', async (_e, member) => { const d = await UserModel.create({ appId: `u${Date.now()}`, ...member }); return safe(toUser(d.toObject())); });
    electron_1.ipcMain.handle('db:members:update', async (_e, id, changes) => { const d = await UserModel.findOneAndUpdate({ appId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toUser(d)) : null; });
    electron_1.ipcMain.handle('db:members:updateRole', async (_e, id, role) => {
        const d = await UserModel.findOneAndUpdate({ appId: id }, { role }, { returnDocument: 'after' }).lean();
        if (!d)
            throw new Error(`Member not found: ${id}`);
        await AuthUserModel.findOneAndUpdate({ appId: id }, { role });
        return safe(toUser(d));
    });
    electron_1.ipcMain.handle('db:members:remove', async (_e, id) => { await UserModel.deleteOne({ appId: id }); await TaskModel.updateMany({ assignees: id }, { $pull: { assignees: id } }); return true; });
    electron_1.ipcMain.handle('db:presence:heartbeat', async (_e, userId) => {
        await UserModel.updateOne({ appId: userId }, { lastSeen: new Date() });
        return true;
    });
    // Attendance
    electron_1.ipcMain.handle('db:attendance:getAll', async () => safe((await AttendanceModel.find().lean()).map((d) => ({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null }))));
    electron_1.ipcMain.handle('db:attendance:set', async (_e, record) => {
        const recordId = `${record.userId}-${record.date}`;
        const d = await AttendanceModel.findOneAndUpdate({ recordId }, { recordId, ...record }, { upsert: true, returnDocument: 'after' }).lean();
        return safe({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null });
    });
    electron_1.ipcMain.handle('db:attendance:delete', async (_e, userId, date) => { await AttendanceModel.deleteOne({ recordId: `${userId}-${date}` }); return true; });
    // Messages
    electron_1.ipcMain.handle('db:messages:getBetween', async (_e, userId, peerId) => {
        const msgs = await MessageModel.find({ $or: [{ fromId: userId, toId: peerId }, { fromId: peerId, toId: userId }] }).sort({ timestamp: 1 }).lean();
        return safe(msgs.map(toMsgFrontend));
    });
    electron_1.ipcMain.handle('db:messages:send', async (_e, msg) => {
        const d = await MessageModel.create({ msgId: `m${Date.now()}`, ...msg });
        return safe(toMsgFrontend(d.toObject()));
    });
    electron_1.ipcMain.handle('db:messages:react', async (_e, msgId, userId, emoji) => {
        const msg = await MessageModel.findOne({ msgId }).lean();
        if (!msg)
            return null;
        const reactions = msg.reactions ? Object.fromEntries(Object.entries(msg.reactions)) : {};
        const users = (reactions[emoji] ?? []);
        if (users.includes(userId))
            reactions[emoji] = users.filter(u => u !== userId);
        else
            reactions[emoji] = [...users, userId];
        const d = await MessageModel.findOneAndUpdate({ msgId }, { reactions }, { returnDocument: 'after' }).lean();
        return d ? safe(toMsgFrontend(d)) : null;
    });
    electron_1.ipcMain.handle('db:messages:delete', async (_e, msgId) => {
        await MessageModel.findOneAndUpdate({ msgId }, { deleted: true });
        return true;
    });
    // Conv meta (pin/star/archive)
    electron_1.ipcMain.handle('db:convmeta:getAll', async (_e, userId) => {
        const docs = await ConvMetaModel.find({ userId }).lean();
        return safe(docs.map(toConvMeta));
    });
    electron_1.ipcMain.handle('db:convmeta:set', async (_e, meta) => {
        const convId = `${meta.userId}-${meta.peerId}`;
        const d = await ConvMetaModel.findOneAndUpdate({ convId }, { convId, ...meta }, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toConvMeta(d));
    });
    // Departments
    electron_1.ipcMain.handle('db:depts:getAll', async () => safe((await DeptModel.find().lean()).map(toDept)));
    electron_1.ipcMain.handle('db:depts:create', async (_e, dept) => { const d = await DeptModel.create({ deptId: `dept${Date.now()}`, ...dept }); return safe(toDept(d.toObject())); });
    electron_1.ipcMain.handle('db:depts:update', async (_e, id, changes) => { const d = await DeptModel.findOneAndUpdate({ deptId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toDept(d)) : null; });
    electron_1.ipcMain.handle('db:depts:delete', async (_e, id) => { await DeptModel.deleteOne({ deptId: id }); return true; });
    // Project rich data
    electron_1.ipcMain.handle('db:projectrich:getAll', async () => safe((await ProjectRichModel.find().lean()).map(toProjectRich)));
    electron_1.ipcMain.handle('db:projectrich:set', async (_e, data) => {
        const d = await ProjectRichModel.findOneAndUpdate({ projectId: data.projectId }, data, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toProjectRich(d));
    });
    electron_1.ipcMain.handle('db:projectrich:delete', async (_e, projectId) => {
        await ProjectRichModel.deleteOne({ projectId });
        return true;
    });
    // Auth
    electron_1.ipcMain.handle('db:auth:login', async (_e, email, password) => {
        const found = await AuthUserModel.findOne({ email: email.toLowerCase() }).lean();
        if (!found)
            throw new Error('Invalid email or password.');
        const valid = await bcryptjs_1.default.compare(password, found.password);
        if (!valid)
            throw new Error('Invalid email or password.');
        return safe(toAuthUser(found));
    });
    electron_1.ipcMain.handle('db:auth:register', async (_e, name, email, password, _role, orgId) => {
        const existing = await AuthUserModel.findOne({ email: email.toLowerCase() }).lean();
        if (existing)
            throw new Error('An account with this email already exists.');
        const appId = `auth-${Date.now()}`;
        const hashed = await bcryptjs_1.default.hash(password, 10);
        // All new registrations start as 'guest' — an admin must upgrade them
        const d = await AuthUserModel.create({ appId, name, email: email.toLowerCase(), password: hashed, role: 'guest', ...(orgId ? { orgId } : {}) });
        await UserModel.create({ appId, name, email: email.toLowerCase(), role: 'guest', status: 'active', ...(orgId ? { orgId } : {}) });
        return safe(toAuthUser(d.toObject()));
    });
    electron_1.ipcMain.handle('db:auth:updatePassword', async (_e, userId, currentPassword, newPassword) => {
        const found = await AuthUserModel.findOne({ appId: userId }).lean();
        if (!found)
            throw new Error('Current password is incorrect.');
        const valid = await bcryptjs_1.default.compare(currentPassword, found.password);
        if (!valid)
            throw new Error('Current password is incorrect.');
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        await AuthUserModel.findOneAndUpdate({ appId: userId }, { password: hashed });
        return true;
    });
    electron_1.ipcMain.handle('db:auth:updateName', async (_e, userId, newName) => {
        await AuthUserModel.findOneAndUpdate({ appId: userId }, { name: newName });
        return true;
    });
    electron_1.ipcMain.handle('db:auth:getAll', async () => {
        const docs = await AuthUserModel.find().lean();
        return safe(docs.map(d => ({ id: d.appId, name: d.name, email: d.email, role: d.role })));
    });
    electron_1.ipcMain.handle('db:auth:updateRole', async (_e, userId, role) => {
        await AuthUserModel.findOneAndUpdate({ appId: userId }, { role });
        return true;
    });
    electron_1.ipcMain.handle('db:auth:seedDefault', async () => {
        const existing = await AuthUserModel.findOne({ email: 'admin@projectm.com' }).lean();
        if (!existing) {
            const hashed = await bcryptjs_1.default.hash('password123', 10);
            await AuthUserModel.create({ appId: 'auth-default', name: 'Admin User', email: 'admin@projectm.com', password: hashed, role: 'admin' });
        }
        // Ensure a User (member) record exists only for the hardcoded seed accounts
        // (do NOT auto-recreate members for every AuthUser — that would un-delete removed users)
        const adminExists = await AuthUserModel.findOne({ email: 'admin@gmail.com' }).lean();
        if (!adminExists) {
            const hashed2 = await bcryptjs_1.default.hash('Admin@123', 10);
            await AuthUserModel.create({ appId: 'auth-toursurv-admin', name: 'Admin', email: 'admin@gmail.com', password: hashed2, role: 'admin' });
        }
        // Ensure Admin has a UserModel (member) entry so they appear in member lists and messages
        const adminMemberExists = await UserModel.findOne({ appId: 'auth-toursurv-admin' }).lean();
        if (!adminMemberExists) {
            await UserModel.create({ appId: 'auth-toursurv-admin', name: 'Admin', email: 'admin@gmail.com', role: 'admin', status: 'active' });
        }
        // Re-hash any existing plain-text passwords (accounts created before hashing was added)
        const allAuthDocs = await AuthUserModel.find().lean();
        for (const doc of allAuthDocs) {
            if (doc.password && !doc.password.startsWith('$2')) {
                const rehashed = await bcryptjs_1.default.hash(doc.password, 10);
                await AuthUserModel.updateOne({ appId: doc.appId }, { password: rehashed });
            }
        }
        const orgExists = await OrgModel.findOne({ orgId: 'org-toursurv' }).lean();
        if (!orgExists) {
            await OrgModel.create({ orgId: 'org-toursurv', name: 'Toursurv', workStart: '09:00', workEnd: '18:00', createdAt: new Date().toISOString() });
        }
        // Seed admin perms (always overwrite to keep routes current)
        await RolePermsModel.findOneAndUpdate({ role: 'admin' }, { allowedRoutes: ['/', '/dashboard', '/messages', '/tasks', '/teams', '/members', '/attendance', '/reports', '/users', '/settings'] }, { upsert: true });
        // Seed guest perms — settings only (always overwrite)
        await RolePermsModel.findOneAndUpdate({ role: 'guest' }, { allowedRoutes: ['/settings'] }, { upsert: true });
        // Seed admin role if it doesn't exist
        const adminRole = await RoleModel.findOne({ name: 'admin' }).lean();
        if (!adminRole) {
            await RoleModel.create({ appId: 'role_admin', name: 'admin', color: '#5030E5' });
        }
        // Seed guest role if it doesn't exist
        const guestRole = await RoleModel.findOne({ name: 'guest' }).lean();
        if (!guestRole) {
            await RoleModel.create({ appId: 'role_guest', name: 'guest', color: '#9CA3AF' });
        }
    });
    // Organization
    electron_1.ipcMain.handle('db:org:get', async () => {
        const d = await OrgModel.findOne().lean();
        return d ? safe(toOrg(d)) : null;
    });
    electron_1.ipcMain.handle('db:org:list', async () => {
        const docs = await OrgModel.find().lean();
        return safe(docs.map(toOrg));
    });
    electron_1.ipcMain.handle('db:org:set', async (_e, data) => {
        const d = await OrgModel.findOneAndUpdate({ orgId: data.id ?? 'org-toursurv' }, { ...data, orgId: data.id ?? 'org-toursurv' }, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toOrg(d));
    });
    // Role permissions
    electron_1.ipcMain.handle('db:roleperms:getAll', async () => {
        const docs = await RolePermsModel.find().lean();
        return safe(docs.map(d => ({ role: d.role, allowedRoutes: d.allowedRoutes ?? [] })));
    });
    electron_1.ipcMain.handle('db:roleperms:set', async (_e, data) => {
        const d = await RolePermsModel.findOneAndUpdate({ role: data.role }, { allowedRoutes: data.allowedRoutes }, { upsert: true, returnDocument: 'after' }).lean();
        return safe({ role: d.role, allowedRoutes: d.allowedRoutes ?? [] });
    });
    // Roles (dynamic role management)
    electron_1.ipcMain.handle('db:roles:getAll', async () => {
        const docs = await RoleModel.find().lean();
        return safe(docs.map(toRole));
    });
    electron_1.ipcMain.handle('db:roles:create', async (_e, data) => {
        if (data.name === 'admin')
            throw new Error('Cannot create a role named admin.');
        const existing = await RoleModel.findOne({ name: data.name }).lean();
        if (existing)
            throw new Error(`Role "${data.name}" already exists.`);
        const d = await RoleModel.create({ appId: `role_${Date.now()}`, name: data.name, color: data.color });
        return safe(toRole(d.toObject()));
    });
    electron_1.ipcMain.handle('db:roles:updateColor', async (_e, data) => {
        const d = await RoleModel.findOneAndUpdate({ appId: data.appId }, { color: data.color }, { returnDocument: 'after' }).lean();
        if (!d)
            throw new Error('Role not found.');
        return safe(toRole(d));
    });
    electron_1.ipcMain.handle('db:roles:rename', async (_e, data) => {
        const role = await RoleModel.findOne({ appId: data.appId }).lean();
        if (!role)
            throw new Error('Role not found.');
        if (role.name === 'admin')
            throw new Error('Cannot rename the admin role.');
        const conflict = await RoleModel.findOne({ name: data.newName }).lean();
        if (conflict)
            throw new Error(`Role "${data.newName}" already exists.`);
        const oldName = role.name;
        await RoleModel.findOneAndUpdate({ appId: data.appId }, { name: data.newName });
        // Cascade: RolePerms — delete old, insert new with same routes
        const oldPerms = await RolePermsModel.findOne({ role: oldName }).lean();
        const allowedRoutes = oldPerms?.allowedRoutes ?? ['/settings'];
        await RolePermsModel.deleteOne({ role: oldName });
        await RolePermsModel.create({ role: data.newName, allowedRoutes });
        // Cascade: User and AuthUser role fields
        await UserModel.updateMany({ role: oldName }, { role: data.newName });
        await AuthUserModel.updateMany({ role: oldName }, { role: data.newName });
        return safe({ ok: true, oldName });
    });
    electron_1.ipcMain.handle('db:roles:delete', async (_e, data) => {
        const role = await RoleModel.findOne({ appId: data.appId }).lean();
        if (!role)
            throw new Error('Role not found.');
        if (role.name === 'admin')
            throw new Error('Cannot delete the admin role.');
        await RoleModel.deleteOne({ appId: data.appId });
        return safe({ ok: true });
    });
    electron_1.ipcMain.handle('db:roleperms:delete', async (_e, data) => {
        await RolePermsModel.deleteOne({ role: data.roleName });
        return safe({ ok: true });
    });
    // User preferences
    electron_1.ipcMain.handle('db:userpref:get', async (_e, userId) => {
        const d = await UserPrefModel.findOne({ userId }).lean();
        return d ? safe(toUserPref(d)) : null;
    });
    electron_1.ipcMain.handle('db:userpref:set', async (_e, prefs) => {
        const d = await UserPrefModel.findOneAndUpdate({ userId: prefs.userId }, prefs, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toUserPref(d));
    });
    // Notification preferences
    electron_1.ipcMain.handle('db:notifpref:get', async (_e, userId) => {
        const d = await NotifPrefModel.findOne({ userId }).lean();
        return d ? safe(toNotifPref(d)) : null;
    });
    electron_1.ipcMain.handle('db:notifpref:set', async (_e, prefs) => {
        const d = await NotifPrefModel.findOneAndUpdate({ userId: prefs.userId }, prefs, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toNotifPref(d));
    });
    // Appearance preferences
    electron_1.ipcMain.handle('db:appearancepref:get', async (_e, userId) => {
        const d = await AppearancePrefModel.findOne({ userId }).lean();
        return d ? safe(toAppearancePref(d)) : null;
    });
    electron_1.ipcMain.handle('db:appearancepref:set', async (_e, prefs) => {
        const d = await AppearancePrefModel.findOneAndUpdate({ userId: prefs.userId }, prefs, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toAppearancePref(d));
    });
    // Notifications
    electron_1.ipcMain.handle('db:notifs:getAll', async (_e, userId) => {
        const docs = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
        return safe(docs.map(toNotif));
    });
    electron_1.ipcMain.handle('db:notifs:create', async (_e, notif) => {
        const notifId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const d = await NotificationModel.create({ notifId, ...notif, createdAt: new Date().toISOString() });
        return safe(toNotif(d.toObject()));
    });
    electron_1.ipcMain.handle('db:notifs:markRead', async (_e, notifId) => {
        await NotificationModel.updateOne({ notifId }, { read: true });
        return true;
    });
    electron_1.ipcMain.handle('db:notifs:markAllRead', async (_e, userId) => {
        await NotificationModel.updateMany({ userId, read: false }, { read: true });
        return true;
    });
    electron_1.ipcMain.handle('db:notifs:deleteOld', async (_e, userId) => {
        const all = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).lean();
        if (all.length > 100) {
            const toDelete = all.slice(100).map((d) => d.notifId);
            await NotificationModel.deleteMany({ notifId: { $in: toDelete } });
        }
        return true;
    });
}
// ─── Auto Updater ─────────────────────────────────────────────────────────────
let autoUpdater = null;
if (!process.env.VITE_DEV_SERVER_URL) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        autoUpdater = require('electron-updater').autoUpdater;
    }
    catch {
        // electron-updater not available in dev
    }
}
function checkForUpdates() {
    if (!mainWindow)
        return;
    if (!autoUpdater) {
        mainWindow.webContents.send('update:error', 'Auto-updater is not available in development mode.');
        return;
    }
    autoUpdater.checkForUpdates().catch((err) => {
        console.error('Update check failed:', err);
        mainWindow?.webContents.send('update:error', err.message);
    });
}
function setupAutoUpdater() {
    if (!autoUpdater)
        return;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('checking-for-update', () => mainWindow?.webContents.send('update:checking'));
    autoUpdater.on('update-available', (info) => mainWindow?.webContents.send('update:available', { version: info.version, releaseDate: info.releaseDate, releaseNotes: info.releaseNotes }));
    autoUpdater.on('update-not-available', () => mainWindow?.webContents.send('update:not-available'));
    autoUpdater.on('download-progress', (p) => mainWindow?.webContents.send('update:download-progress', { percent: Math.round(p.percent), transferred: p.transferred, total: p.total, bytesPerSecond: p.bytesPerSecond }));
    autoUpdater.on('update-downloaded', (info) => mainWindow?.webContents.send('update:downloaded', { version: info.version }));
    autoUpdater.on('error', (err) => mainWindow?.webContents.send('update:error', err.message));
}
// ─── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400, height: 900, minWidth: 1100, minHeight: 700,
        icon: path_1.default.join(__dirname, '../build/icon.icns'),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
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
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
        if (autoUpdater)
            setTimeout(() => checkForUpdates(), 3000);
        startMessageStream();
    });
    mainWindow.on('closed', () => { mainWindow = null; });
    // Block end-user refresh shortcuts in production (Ctrl+R, Cmd+R, F5)
    if (!process.env.VITE_DEV_SERVER_URL) {
        mainWindow.webContents.on('before-input-event', (event, input) => {
            const isReload =
                (input.key === 'r' && (input.control || input.meta)) ||
                (input.key === 'F5');
            if (isReload) event.preventDefault();
        });
    }
}
// ─── App lifecycle ─────────────────────────────────────────────────────────────
electron_1.app.whenReady().then(async () => {
    registerDbHandlers();
    electron_1.ipcMain.handle('update:check', () => checkForUpdates());
    electron_1.ipcMain.handle('update:install', () => { if (autoUpdater)
        autoUpdater.quitAndInstall(false, true); });
    electron_1.ipcMain.handle('app:version', () => electron_1.app.getVersion());
    setupAutoUpdater();
    await connectDB();
    createWindow();
});
electron_1.app.on('before-quit', () => {
    if (messageStream) {
        try {
            messageStream.close();
        }
        catch (_) { }
        messageStream = null;
    }
});
electron_1.app.on('window-all-closed', () => { if (process.platform !== 'darwin')
    electron_1.app.quit(); });
electron_1.app.on('activate', () => { if (electron_1.BrowserWindow.getAllWindows().length === 0)
    createWindow(); });
