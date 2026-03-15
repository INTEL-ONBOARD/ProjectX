import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import dotenv from 'dotenv';
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(__dirname, '../.env') });

// ─── Mongoose Schemas ──────────────────────────────────────────────────────────

const UserSchema = new Schema({
    appId:       { type: String, required: true, unique: true },
    name:        String,
    avatar:      { type: String, default: '' },
    email:       String,
    location:    String,
    role:        { type: String, default: 'member' },
    designation: String,
    status:      { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastSeen:    { type: Date, default: null },
});

const TaskSchema = new Schema({
    appId:       { type: String, required: true, unique: true },
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    priority:    { type: String, enum: ['low', 'high', 'completed'], default: 'low' },
    status:      { type: String, enum: ['todo', 'in-progress', 'ready-for-qa', 'deployment-pending', 'blocker', 'done'], default: 'todo' },
    assignees:   [String],
    comments:    { type: Number, default: 0 },
    files:       { type: Number, default: 0 },
    images:      [String],
    dueDate:     String,
    projectId:   String,
});

const ProjectSchema = new Schema({
    appId: { type: String, required: true, unique: true },
    name:  { type: String, required: true },
    color: { type: String, default: '#7AC555' },
});

const AttendanceSchema = new Schema({
    recordId: { type: String, required: true, unique: true },
    userId:   { type: String, required: true },
    date:     { type: String, required: true },
    checkIn:  String,
    checkOut: String,
    status:   { type: String, enum: ['present', 'absent', 'half-day', 'on-leave', 'holiday', 'wfh'], default: 'present' },
    notes:    String,
});

const MessageSchema = new Schema({
    msgId:     { type: String, required: true, unique: true },
    fromId:    { type: String, required: true },
    toId:      { type: String, required: true },
    text:      { type: String, required: true },
    timestamp: { type: String, required: true },
    reactions: { type: Map, of: [String], default: {} },
    deleted:   { type: Boolean, default: false },
});

const ConvMetaSchema = new Schema({
    convId:   { type: String, required: true, unique: true },
    userId:   { type: String, required: true },
    peerId:   { type: String, required: true },
    pinned:   { type: Boolean, default: false },
    starred:  { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
});

const DeptSchema = new Schema({
    deptId:    { type: String, required: true, unique: true },
    name:      { type: String, required: true },
    color:     { type: String, default: '#5030E5' },
    memberIds: [String],
});

const ProjectRichSchema = new Schema({
    projectId:   { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    status:      { type: String, enum: ['active', 'on-hold', 'completed'], default: 'active' },
    priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    memberIds:   [String],
    dueDate:     { type: String, default: '' },
    starred:     { type: Boolean, default: false },
    category:    { type: String, default: 'General' },
});

const AuthUserSchema = new Schema({
    appId:    { type: String, required: true, unique: true },
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:     { type: String, default: 'member' },
});

const UserPrefSchema = new Schema({
    userId:               { type: String, required: true, unique: true },
    theme:                { type: String, enum: ['light', 'dark'], default: 'light' },
    sidebarCollapsed:     { type: Boolean, default: false },
    selectedWeekStart:    { type: String, default: null },
    hasSeenWalkthrough:   { type: Boolean, default: false },
    projectsView:         { type: String, enum: ['grid', 'list'], default: 'grid' },
    taskBreakdownSnapshot: { type: Schema.Types.Mixed, default: {} },
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

const OrgSchema = new Schema({
    orgId:     { type: String, required: true, unique: true },
    name:      { type: String, required: true },
    logo:      { type: String, default: '' },
    address:   { type: String, default: '' },
    workStart: { type: String, default: '09:00' },
    workEnd:   { type: String, default: '18:00' },
    createdAt: { type: String, default: () => new Date().toISOString() },
});

const RolePermsSchema = new Schema({
    role:          { type: String, required: true, unique: true },
    allowedRoutes: { type: [String], default: [] },
});

const UserModel           = mongoose.model('User', UserSchema);
const TaskModel           = mongoose.model('Task', TaskSchema);
const ProjectModel        = mongoose.model('Project', ProjectSchema);
const AttendanceModel     = mongoose.model('Attendance', AttendanceSchema);
const MessageModel        = mongoose.model('Message', MessageSchema);
const ConvMetaModel       = mongoose.model('ConvMeta', ConvMetaSchema);
const DeptModel           = mongoose.model('Dept', DeptSchema);
const ProjectRichModel    = mongoose.model('ProjectRich', ProjectRichSchema);
const AuthUserModel       = mongoose.model('AuthUser', AuthUserSchema);
const UserPrefModel       = mongoose.model('UserPref', UserPrefSchema);
const NotifPrefModel      = mongoose.model('NotifPref', NotifPrefSchema);
const AppearancePrefModel = mongoose.model('AppearancePref', AppearancePrefSchema);
const OrgModel            = mongoose.model('Org', OrgSchema);
const RolePermsModel      = mongoose.model('RolePerms', RolePermsSchema);

const RoleSchema = new Schema({
    appId: { type: String, required: true, unique: true },
    name:  { type: String, required: true, unique: true },
    color: { type: String, default: '#9CA3AF' },
});
const RoleModel = mongoose.model('Role', RoleSchema);

// ─── Helpers ───────────────────────────────────────────────────────────────────

// Safe serialization — strips Mongoose internals before IPC transfer
const safe = (v: unknown) => JSON.parse(JSON.stringify(v));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toUser = (d: any) => ({ id: d.appId, name: d.name, avatar: d.avatar ?? '', email: d.email ?? '', location: d.location ?? '', role: d.role, designation: d.designation ?? '', status: d.status, lastSeen: d.lastSeen?.toISOString() ?? null });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProject     = (d: any) => ({ id: d.appId, name: d.name, color: d.color, tasks: [] });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toTask        = (d: any) => ({ id: d.appId, title: d.title, description: d.description ?? '', priority: d.priority, status: d.status, assignees: (d.assignees ?? []).map(String), comments: d.comments ?? 0, files: d.files ?? 0, images: (d.images ?? []).map(String), dueDate: d.dueDate ?? null, projectId: d.projectId ?? null });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toAuthUser    = (d: any) => ({ id: d.appId, name: d.name, email: d.email, role: d.role });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDept        = (d: any) => ({ id: d.deptId, name: d.name, color: d.color, memberIds: (d.memberIds ?? []).map(String) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toProjectRich = (d: any) => ({ projectId: d.projectId, description: d.description ?? '', status: d.status, priority: d.priority, memberIds: Array.from(d.memberIds ?? []), dueDate: d.dueDate ?? '', starred: d.starred ?? false, category: d.category ?? 'General' });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMsg         = (d: any) => ({ id: d.msgId, fromId: d.fromId, toId: d.toId, text: d.text, timestamp: d.timestamp, reactions: d.reactions ? Object.fromEntries(Object.entries(d.reactions)) : {}, deleted: d.deleted ?? false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toConvMeta    = (d: any) => ({ convId: d.convId, userId: d.userId, peerId: d.peerId, pinned: d.pinned ?? false, starred: d.starred ?? false, archived: d.archived ?? false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toOrg         = (d: any) => ({ id: d.orgId, name: d.name, logo: d.logo ?? '', address: d.address ?? '', workStart: d.workStart ?? '09:00', workEnd: d.workEnd ?? '18:00', createdAt: d.createdAt ?? '' });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toUserPref    = (d: any) => ({ userId: d.userId, theme: d.theme, sidebarCollapsed: d.sidebarCollapsed ?? false, selectedWeekStart: d.selectedWeekStart ?? null, hasSeenWalkthrough: d.hasSeenWalkthrough ?? false, projectsView: d.projectsView ?? 'grid', taskBreakdownSnapshot: d.taskBreakdownSnapshot ?? {} });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toNotifPref   = (d: any) => ({ userId: d.userId, taskUpdates: d.taskUpdates, teamMentions: d.teamMentions, weeklyDigest: d.weeklyDigest, emailNotifs: d.emailNotifs, pushNotifs: d.pushNotifs, smsNotifs: d.smsNotifs, projectUpdates: d.projectUpdates, securityAlerts: d.securityAlerts, quietHours: d.quietHours });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toAppearancePref = (d: any) => ({ userId: d.userId, themeMode: d.themeMode, accentColor: d.accentColor, fontSize: d.fontSize, compactMode: d.compactMode ?? false });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toRole = (d: any) => ({ appId: d.appId, name: d.name, color: d.color ?? '#9CA3AF' });

// ─── MongoDB connection ────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://Vercel-Admin-atlas-bole-drum:VdbAV9Wt4XDKbNgs@atlas-bole-drum.81ktiub.mongodb.net/projectx?retryWrites=true&w=majority';
    if (!uri) { console.error('MONGODB_URI not set'); return; }
    const opts = { serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000, socketTimeoutMS: 45000 };

    // Listen for mongoose disconnect/reconnect events once
    mongoose.connection.once('connected', () => {});
    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        if (mainWindow) mainWindow.webContents.send('db:disconnected');
    });
    mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
        if (mainWindow) mainWindow.webContents.send('db:reconnected');
    });

    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            await mongoose.connect(uri, opts);
            console.log('MongoDB connected');
            if (mainWindow) mainWindow.webContents.send('db:connected');
            return;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`MongoDB connection attempt ${attempt} failed:`, msg);
            if (attempt < 5) {
                const delay = attempt * 3000;
                console.log(`Retrying in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                console.error('MongoDB connection failed after 5 attempts.');
                if (mainWindow) mainWindow.webContents.send('db:connection-failed', msg);
            }
        }
    }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerDbHandlers() {
    // Projects
    ipcMain.handle('db:projects:getAll', async () => safe((await ProjectModel.find().lean()).map(toProject)));
    ipcMain.handle('db:projects:create', async (_e, name: string, color: string) => { const d = await ProjectModel.create({ appId: `p${Date.now()}`, name, color }); return safe(toProject(d.toObject())); });
    ipcMain.handle('db:projects:update', async (_e, id: string, changes: object) => { const d = await ProjectModel.findOneAndUpdate({ appId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toProject(d)) : null; });
    ipcMain.handle('db:projects:delete', async (_e, id: string) => { await ProjectModel.deleteOne({ appId: id }); await TaskModel.updateMany({ projectId: id }, { $unset: { projectId: '' } }); return true; });

    // Tasks
    ipcMain.handle('db:tasks:getAll', async () => safe((await TaskModel.find().lean()).map(toTask)));
    ipcMain.handle('db:tasks:create', async (_e, taskData: object) => { const d = await TaskModel.create({ appId: `t${Date.now()}`, ...taskData }); return safe(toTask(d.toObject())); });
    ipcMain.handle('db:tasks:update', async (_e, id: string, changes: object) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toTask(d)) : null; });
    ipcMain.handle('db:tasks:delete', async (_e, id: string) => { await TaskModel.deleteOne({ appId: id }); return true; });
    ipcMain.handle('db:tasks:move', async (_e, id: string, newStatus: string) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, { status: newStatus }, { returnDocument: 'after' }).lean(); return d ? safe(toTask(d)) : null; });
    ipcMain.handle('db:tasks:scrubAssignee', async (_e, memberId: string) => { await TaskModel.updateMany({ assignees: memberId }, { $pull: { assignees: memberId } }); return true; });

    // Members
    ipcMain.handle('db:members:getAll', async () => safe((await UserModel.find().lean()).map(toUser)));
    ipcMain.handle('db:members:add', async (_e, member: object) => { const d = await UserModel.create({ appId: `u${Date.now()}`, ...member }); return safe(toUser(d.toObject())); });
    ipcMain.handle('db:members:update', async (_e, id: string, changes: object) => { const d = await UserModel.findOneAndUpdate({ appId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toUser(d)) : null; });
    ipcMain.handle('db:members:updateRole', async (_e, id: string, role: string) => {
        const d = await UserModel.findOneAndUpdate({ appId: id }, { role }, { returnDocument: 'after' }).lean();
        if (!d) throw new Error(`Member not found: ${id}`);
        await AuthUserModel.findOneAndUpdate({ appId: id }, { role });
        return safe(toUser(d));
    });
    ipcMain.handle('db:members:remove', async (_e, id: string) => { await UserModel.deleteOne({ appId: id }); await TaskModel.updateMany({ assignees: id }, { $pull: { assignees: id } }); return true; });
    ipcMain.handle('db:presence:heartbeat', async (_e, userId: string) => {
        await UserModel.updateOne({ appId: userId }, { lastSeen: new Date() });
        return true;
    });

    // Attendance
    ipcMain.handle('db:attendance:getAll', async () => safe((await AttendanceModel.find().lean()).map((d: any) => ({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null }))));
    ipcMain.handle('db:attendance:set', async (_e, record: { userId: string; date: string; status: string; checkIn?: string; checkOut?: string; notes?: string }) => {
        const recordId = `${record.userId}-${record.date}`;
        const d = await AttendanceModel.findOneAndUpdate({ recordId }, { recordId, ...record }, { upsert: true, returnDocument: 'after' }).lean() as any;
        return safe({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null });
    });
    ipcMain.handle('db:attendance:delete', async (_e, userId: string, date: string) => { await AttendanceModel.deleteOne({ recordId: `${userId}-${date}` }); return true; });

    // Messages
    ipcMain.handle('db:messages:getBetween', async (_e, userId: string, peerId: string) => {
        const msgs = await MessageModel.find({ $or: [{ fromId: userId, toId: peerId }, { fromId: peerId, toId: userId }] }).sort({ timestamp: 1 }).lean();
        return safe(msgs.map(toMsg));
    });
    ipcMain.handle('db:messages:send', async (_e, msg: object) => {
        const d = await MessageModel.create({ msgId: `m${Date.now()}`, ...msg });
        return safe(toMsg(d.toObject()));
    });
    ipcMain.handle('db:messages:react', async (_e, msgId: string, userId: string, emoji: string) => {
        const msg = await MessageModel.findOne({ msgId }).lean() as any;
        if (!msg) return null;
        const reactions: Record<string, string[]> = msg.reactions ? Object.fromEntries(Object.entries(msg.reactions)) : {};
        const users = (reactions[emoji] ?? []) as string[];
        if (users.includes(userId)) reactions[emoji] = users.filter(u => u !== userId);
        else reactions[emoji] = [...users, userId];
        const d = await MessageModel.findOneAndUpdate({ msgId }, { reactions }, { returnDocument: 'after' }).lean();
        return d ? safe(toMsg(d)) : null;
    });
    ipcMain.handle('db:messages:delete', async (_e, msgId: string) => {
        await MessageModel.findOneAndUpdate({ msgId }, { deleted: true });
        return true;
    });

    // Conv meta (pin/star/archive)
    ipcMain.handle('db:convmeta:getAll', async (_e, userId: string) => {
        const docs = await ConvMetaModel.find({ userId }).lean();
        return safe(docs.map(toConvMeta));
    });
    ipcMain.handle('db:convmeta:set', async (_e, meta: { userId: string; peerId: string; [k: string]: unknown }) => {
        const convId = `${meta.userId}-${meta.peerId}`;
        const d = await ConvMetaModel.findOneAndUpdate({ convId }, { convId, ...meta }, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toConvMeta(d));
    });

    // Departments
    ipcMain.handle('db:depts:getAll', async () => safe((await DeptModel.find().lean()).map(toDept)));
    ipcMain.handle('db:depts:create', async (_e, dept: object) => { const d = await DeptModel.create({ deptId: `dept${Date.now()}`, ...dept }); return safe(toDept(d.toObject())); });
    ipcMain.handle('db:depts:update', async (_e, id: string, changes: object) => { const d = await DeptModel.findOneAndUpdate({ deptId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toDept(d)) : null; });
    ipcMain.handle('db:depts:delete', async (_e, id: string) => { await DeptModel.deleteOne({ deptId: id }); return true; });

    // Project rich data
    ipcMain.handle('db:projectrich:getAll', async () => safe((await ProjectRichModel.find().lean()).map(toProjectRich)));
    ipcMain.handle('db:projectrich:set', async (_e, data: { projectId: string; [k: string]: unknown }) => {
        const d = await ProjectRichModel.findOneAndUpdate({ projectId: data.projectId }, data, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toProjectRich(d));
    });
    ipcMain.handle('db:projectrich:delete', async (_e, projectId: string) => {
        await ProjectRichModel.deleteOne({ projectId });
        return true;
    });

    // Auth
    ipcMain.handle('db:auth:login', async (_e, email: string, password: string) => {
        const found = await AuthUserModel.findOne({ email: email.toLowerCase() }).lean() as any;
        if (!found) throw new Error('Invalid email or password.');
        const valid = await bcrypt.compare(password, found.password);
        if (!valid) throw new Error('Invalid email or password.');
        return safe(toAuthUser(found));
    });
    ipcMain.handle('db:auth:register', async (_e, name: string, email: string, password: string, _role: string, orgId?: string) => {
        const existing = await AuthUserModel.findOne({ email: email.toLowerCase() }).lean();
        if (existing) throw new Error('An account with this email already exists.');
        const appId = `auth-${Date.now()}`;
        const hashed = await bcrypt.hash(password, 10);
        // All new registrations start as 'guest' — an admin must upgrade them
        const d = await AuthUserModel.create({ appId, name, email: email.toLowerCase(), password: hashed, role: 'guest', ...(orgId ? { orgId } : {}) });
        await UserModel.create({ appId, name, email: email.toLowerCase(), role: 'guest', status: 'active', ...(orgId ? { orgId } : {}) });
        return safe(toAuthUser(d.toObject()));
    });
    ipcMain.handle('db:auth:updatePassword', async (_e, userId: string, currentPassword: string, newPassword: string) => {
        const found = await AuthUserModel.findOne({ appId: userId }).lean() as any;
        if (!found) throw new Error('Current password is incorrect.');
        const valid = await bcrypt.compare(currentPassword, found.password);
        if (!valid) throw new Error('Current password is incorrect.');
        const hashed = await bcrypt.hash(newPassword, 10);
        await AuthUserModel.findOneAndUpdate({ appId: userId }, { password: hashed });
        return true;
    });
    ipcMain.handle('db:auth:updateName', async (_e, userId: string, newName: string) => {
        await AuthUserModel.findOneAndUpdate({ appId: userId }, { name: newName });
        return true;
    });
    ipcMain.handle('db:auth:getAll', async () => {
        const docs = await AuthUserModel.find().lean() as any[];
        return safe(docs.map(d => ({ id: d.appId, name: d.name, email: d.email, role: d.role })));
    });
    ipcMain.handle('db:auth:updateRole', async (_e, userId: string, role: string) => {
        await AuthUserModel.findOneAndUpdate({ appId: userId }, { role });
        return true;
    });
    ipcMain.handle('db:auth:seedDefault', async () => {
        const existing = await AuthUserModel.findOne({ email: 'admin@projectm.com' }).lean() as any;
        if (!existing) {
            const hashed = await bcrypt.hash('password123', 10);
            await AuthUserModel.create({ appId: 'auth-default', name: 'Admin User', email: 'admin@projectm.com', password: hashed, role: 'admin' });
        }
        // Ensure a User (member) record exists for every AuthUser
        const allAuthUsers = await AuthUserModel.find().lean() as any[];
        for (const au of allAuthUsers) {
            const memberExists = await UserModel.findOne({ appId: au.appId }).lean();
            if (!memberExists) {
                await UserModel.create({ appId: au.appId, name: au.name, email: au.email, role: au.role, status: 'active' });
            }
        }
        const adminExists = await AuthUserModel.findOne({ email: 'admin@gmail.com' }).lean();
        if (!adminExists) {
            const hashed2 = await bcrypt.hash('Admin@123', 10);
            await AuthUserModel.create({ appId: 'auth-toursurv-admin', name: 'Admin', email: 'admin@gmail.com', password: hashed2, role: 'admin' });
        }
        // Re-hash any existing plain-text passwords (accounts created before hashing was added)
        const allAuthDocs = await AuthUserModel.find().lean() as any[];
        for (const doc of allAuthDocs) {
            if (doc.password && !doc.password.startsWith('$2')) {
                const rehashed = await bcrypt.hash(doc.password, 10);
                await AuthUserModel.updateOne({ appId: doc.appId }, { password: rehashed });
            }
        }
        const orgExists = await OrgModel.findOne({ orgId: 'org-toursurv' }).lean();
        if (!orgExists) {
            await OrgModel.create({ orgId: 'org-toursurv', name: 'Toursurv', workStart: '09:00', workEnd: '18:00', createdAt: new Date().toISOString() });
        }
        // Seed admin perms (always overwrite to keep routes current)
        await RolePermsModel.findOneAndUpdate(
            { role: 'admin' },
            { allowedRoutes: ['/', '/dashboard', '/messages', '/tasks', '/teams', '/members', '/attendance', '/reports', '/users', '/settings'] },
            { upsert: true }
        );
        // Seed guest perms — settings only (always overwrite)
        await RolePermsModel.findOneAndUpdate(
            { role: 'guest' },
            { allowedRoutes: ['/settings'] },
            { upsert: true }
        );
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
    ipcMain.handle('db:org:get', async () => {
        const d = await OrgModel.findOne().lean();
        return d ? safe(toOrg(d)) : null;
    });
    ipcMain.handle('db:org:list', async () => {
        const docs = await OrgModel.find().lean() as any[];
        return safe(docs.map(toOrg));
    });
    ipcMain.handle('db:org:set', async (_e, data: { id?: string; [k: string]: unknown }) => {
        const d = await OrgModel.findOneAndUpdate({ orgId: data.id ?? 'org-toursurv' }, { ...data, orgId: data.id ?? 'org-toursurv' }, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toOrg(d));
    });

    // Role permissions
    ipcMain.handle('db:roleperms:getAll', async () => {
        const docs = await RolePermsModel.find().lean() as any[];
        return safe(docs.map(d => ({ role: d.role, allowedRoutes: d.allowedRoutes ?? [] })));
    });
    ipcMain.handle('db:roleperms:set', async (_e, data: { role: string; allowedRoutes: string[] }) => {
        const d = await RolePermsModel.findOneAndUpdate({ role: data.role }, { allowedRoutes: data.allowedRoutes }, { upsert: true, returnDocument: 'after' }).lean() as any;
        return safe({ role: d.role, allowedRoutes: d.allowedRoutes ?? [] });
    });

    // Roles (dynamic role management)
    ipcMain.handle('db:roles:getAll', async () => {
        const docs = await RoleModel.find().lean() as any[];
        return safe(docs.map(toRole));
    });

    ipcMain.handle('db:roles:create', async (_e, data: { name: string; color: string }) => {
        if (data.name === 'admin') throw new Error('Cannot create a role named admin.');
        const existing = await RoleModel.findOne({ name: data.name }).lean();
        if (existing) throw new Error(`Role "${data.name}" already exists.`);
        const d = await RoleModel.create({ appId: `role_${Date.now()}`, name: data.name, color: data.color });
        return safe(toRole(d.toObject()));
    });

    ipcMain.handle('db:roles:updateColor', async (_e, data: { appId: string; color: string }) => {
        const d = await RoleModel.findOneAndUpdate({ appId: data.appId }, { color: data.color }, { returnDocument: 'after' }).lean();
        if (!d) throw new Error('Role not found.');
        return safe(toRole(d));
    });

    ipcMain.handle('db:roles:rename', async (_e, data: { appId: string; newName: string }) => {
        const role = await RoleModel.findOne({ appId: data.appId }).lean() as any;
        if (!role) throw new Error('Role not found.');
        if (role.name === 'admin') throw new Error('Cannot rename the admin role.');
        const conflict = await RoleModel.findOne({ name: data.newName }).lean();
        if (conflict) throw new Error(`Role "${data.newName}" already exists.`);
        const oldName = role.name;
        await RoleModel.findOneAndUpdate({ appId: data.appId }, { name: data.newName });
        // Cascade: RolePerms — delete old, insert new with same routes
        const oldPerms = await RolePermsModel.findOne({ role: oldName }).lean() as any;
        const allowedRoutes = oldPerms?.allowedRoutes ?? ['/settings'];
        await RolePermsModel.deleteOne({ role: oldName });
        await RolePermsModel.create({ role: data.newName, allowedRoutes });
        // Cascade: User and AuthUser role fields
        await UserModel.updateMany({ role: oldName }, { role: data.newName });
        await AuthUserModel.updateMany({ role: oldName }, { role: data.newName });
        return safe({ ok: true, oldName });
    });

    ipcMain.handle('db:roles:delete', async (_e, data: { appId: string }) => {
        const role = await RoleModel.findOne({ appId: data.appId }).lean() as any;
        if (!role) throw new Error('Role not found.');
        if (role.name === 'admin') throw new Error('Cannot delete the admin role.');
        await RoleModel.deleteOne({ appId: data.appId });
        return safe({ ok: true });
    });

    ipcMain.handle('db:roleperms:delete', async (_e, data: { roleName: string }) => {
        await RolePermsModel.deleteOne({ role: data.roleName });
        return safe({ ok: true });
    });

    // User preferences
    ipcMain.handle('db:userpref:get', async (_e, userId: string) => {
        const d = await UserPrefModel.findOne({ userId }).lean();
        return d ? safe(toUserPref(d)) : null;
    });
    ipcMain.handle('db:userpref:set', async (_e, prefs: object) => {
        const d = await UserPrefModel.findOneAndUpdate({ userId: (prefs as any).userId }, prefs, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toUserPref(d));
    });

    // Notification preferences
    ipcMain.handle('db:notifpref:get', async (_e, userId: string) => {
        const d = await NotifPrefModel.findOne({ userId }).lean();
        return d ? safe(toNotifPref(d)) : null;
    });
    ipcMain.handle('db:notifpref:set', async (_e, prefs: object) => {
        const d = await NotifPrefModel.findOneAndUpdate({ userId: (prefs as any).userId }, prefs, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toNotifPref(d));
    });

    // Appearance preferences
    ipcMain.handle('db:appearancepref:get', async (_e, userId: string) => {
        const d = await AppearancePrefModel.findOne({ userId }).lean();
        return d ? safe(toAppearancePref(d)) : null;
    });
    ipcMain.handle('db:appearancepref:set', async (_e, prefs: object) => {
        const d = await AppearancePrefModel.findOneAndUpdate({ userId: (prefs as any).userId }, prefs, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toAppearancePref(d));
    });
}

// ─── Auto Updater ─────────────────────────────────────────────────────────────

let autoUpdater: typeof import('electron-updater').autoUpdater | null = null;
if (!process.env.VITE_DEV_SERVER_URL) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        autoUpdater = require('electron-updater').autoUpdater;
    } catch {
        // electron-updater not available in dev
    }
}

function checkForUpdates() {
    if (!mainWindow) return;
    if (!autoUpdater) {
        mainWindow.webContents.send('update:error', 'Auto-updater is not available in development mode.');
        return;
    }
    autoUpdater.checkForUpdates().catch((err: Error) => {
        console.error('Update check failed:', err);
        mainWindow?.webContents.send('update:error', err.message);
    });
}

function setupAutoUpdater() {
    if (!autoUpdater) return;
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
        mainWindow?.show();
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
