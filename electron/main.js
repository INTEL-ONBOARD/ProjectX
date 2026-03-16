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
    role: { type: String, default: 'member' },
    designation: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastSeen: { type: Date, default: null },
});

const TaskSchema = new Schema({
    appId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'high', 'completed'], default: 'low' },
    status: { type: String, enum: ['todo', 'in-progress', 'ready-for-qa', 'deployment-pending', 'blocker', 'done'], default: 'todo' },
    assignees: [String],
    comments: { type: Number, default: 0 },
    commentData: { type: [{ id: String, author: String, text: String, time: String }], default: [] },
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
    breakSessions: { type: [{ start: String, end: String }], default: [] },
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
    role:     { type: String, default: 'member' },
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

const NotificationSchema = new Schema({
    notifId:   { type: String, required: true, unique: true },
    userId:    { type: String, required: true },
    type:      { type: String, enum: ['task_overdue', 'task_assigned', 'new_message'], required: true },
    title:     { type: String, required: true },
    body:      { type: String, default: '' },
    refId:     { type: String, default: '' },
    read:      { type: Boolean, default: false },
    createdAt: { type: String, required: true },
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

const AuthUserModel = mongoose.model('AuthUser', AuthUserSchema);
const UserPrefModel = mongoose.model('UserPref', UserPrefSchema);
const NotifPrefModel = mongoose.model('NotifPref', NotifPrefSchema);
const NotificationModel = mongoose.model('Notification', NotificationSchema);
const AppearancePrefModel = mongoose.model('AppearancePref', AppearancePrefSchema);
const RolePermsSchema = new Schema({
    role:           { type: String, required: true, unique: true },
    allowedRoutes:  { type: [String], default: [] },
});

const RoleSchema = new Schema({
    appId: { type: String, required: true, unique: true },
    name:  { type: String, required: true, unique: true },
    color: { type: String, default: '#9CA3AF' },
});

const OrgModel = mongoose.model('Org', OrgSchema);
const RolePermsModel = mongoose.model('RolePerms', RolePermsSchema);
const RoleModel = mongoose.model('Role', RoleSchema);
const UserModel = mongoose.model('User', UserSchema);
const TaskModel = mongoose.model('Task', TaskSchema);
const ProjectModel = mongoose.model('Project', ProjectSchema);
const AttendanceModel = mongoose.model('Attendance', AttendanceSchema);
const MessageModel = mongoose.model('Message', MessageSchema);
const ConvMetaModel = mongoose.model('ConvMeta', ConvMetaSchema);
const DeptModel = mongoose.model('Dept', DeptSchema);
const ProjectRichModel = mongoose.model('ProjectRich', ProjectRichSchema);

// ─── Helpers ───────────────────────────────────────────────────────────────────

const toUser = d => ({ id: d.appId, name: d.name, avatar: d.avatar ?? '', email: d.email ?? '', location: d.location ?? '', role: d.role, designation: d.designation ?? '', status: d.status, lastSeen: d.lastSeen?.toISOString() ?? null });
const toProject = d => ({ id: d.appId, name: d.name, color: d.color, tasks: [] });
const toRole = d => ({ appId: d.appId, name: d.name, color: d.color ?? '#9CA3AF' });
const toTask = d => ({ id: d.appId, title: d.title, description: d.description ?? '', priority: d.priority, status: d.status, assignees: (d.assignees ?? []).map(String), comments: d.comments ?? 0, commentData: (d.commentData ?? []).map(c => ({ id: c.id, author: c.author, text: c.text, time: c.time })), files: d.files ?? 0, images: (d.images ?? []).map(String), dueDate: d.dueDate ?? null, projectId: d.projectId ?? null });

// ─── MongoDB connection ────────────────────────────────────────────────────────

async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://Vercel-Admin-atlas-bole-drum:VdbAV9Wt4XDKbNgs@atlas-bole-drum.81ktiub.mongodb.net/projectx?retryWrites=true&w=majority';
    if (!uri) { console.error('MONGODB_URI not set'); return; }
    const opts = { serverSelectionTimeoutMS: 30000, connectTimeoutMS: 30000, socketTimeoutMS: 45000 };
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            await mongoose.connect(uri, opts);
            console.log('MongoDB connected');
            if (mainWindow) mainWindow.webContents.send('db:connected');
            return;
        } catch (err) {
            console.error(`MongoDB connection attempt ${attempt} failed:`, err.message);
            if (attempt < 5) {
                const delay = attempt * 3000;
                console.log(`Retrying in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                console.error('MongoDB connection failed after 5 attempts.');
                if (mainWindow) mainWindow.webContents.send('db:connection-failed', err.message);
            }
        }
    }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// Safe serialization helper — strips all Mongoose internals before IPC transfer
const safe = v => JSON.parse(JSON.stringify(v));

function registerDbHandlers() {
    ipcMain.handle('db:projects:getAll', async () => safe((await ProjectModel.find().lean()).map(toProject)));
    ipcMain.handle('db:projects:create', async (_e, name, color) => { const d = await ProjectModel.create({ appId: `p${Date.now()}`, name, color }); return safe(toProject(d.toObject())); });
    ipcMain.handle('db:projects:update', async (_e, id, changes) => { const d = await ProjectModel.findOneAndUpdate({ appId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toProject(d)) : null; });
    ipcMain.handle('db:projects:delete', async (_e, id) => { await ProjectModel.deleteOne({ appId: id }); await TaskModel.updateMany({ projectId: id }, { $unset: { projectId: '' } }); return true; });

    ipcMain.handle('db:tasks:getAll', async () => safe((await TaskModel.find().lean()).map(toTask)));
    ipcMain.handle('db:tasks:create', async (_e, taskData) => { const d = await TaskModel.create({ appId: `t${Date.now()}`, ...taskData }); return safe(toTask(d.toObject())); });
    ipcMain.handle('db:tasks:update', async (_e, id, changes) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toTask(d)) : null; });
    ipcMain.handle('db:tasks:delete', async (_e, id) => { await TaskModel.deleteOne({ appId: id }); return true; });
    ipcMain.handle('db:tasks:move', async (_e, id, newStatus) => { const d = await TaskModel.findOneAndUpdate({ appId: id }, { status: newStatus }, { returnDocument: 'after' }).lean(); return d ? safe(toTask(d)) : null; });
    ipcMain.handle('db:tasks:scrubAssignee', async (_e, memberId) => { await TaskModel.updateMany({ assignees: memberId }, { $pull: { assignees: memberId } }); return true; });

    ipcMain.handle('db:members:getAll', async () => safe((await UserModel.find().lean()).map(toUser)));
    ipcMain.handle('db:members:add', async (_e, member) => { const d = await UserModel.create({ appId: `u${Date.now()}`, ...member }); return safe(toUser(d.toObject())); });
    ipcMain.handle('db:members:update', async (_e, id, changes) => { const d = await UserModel.findOneAndUpdate({ appId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toUser(d)) : null; });
    ipcMain.handle('db:members:updateRole', async (_e, id, role) => {
        const d = await UserModel.findOneAndUpdate({ appId: id }, { role }, { returnDocument: 'after' }).lean();
        if (!d) throw new Error(`Member not found: ${id}`);
        await AuthUserModel.findOneAndUpdate({ appId: id }, { role });
        return safe(toUser(d));
    });
    ipcMain.handle('db:members:remove', async (_e, id) => { await UserModel.deleteOne({ appId: id }); await TaskModel.updateMany({ assignees: id }, { $pull: { assignees: id } }); return true; });
    ipcMain.handle('db:presence:heartbeat', async (_e, userId) => {
        await UserModel.updateOne({ appId: userId }, { lastSeen: new Date() });
        return true;
    });

    ipcMain.handle('db:attendance:getAll', async () => safe((await AttendanceModel.find().lean()).map(d => ({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null, breakSessions: (d.breakSessions ?? []).map(b => ({ start: b.start, end: b.end ?? null })) }))));
    ipcMain.handle('db:attendance:set', async (_e, record) => {
        const recordId = `${record.userId}-${record.date}`;
        const d = await AttendanceModel.findOneAndUpdate({ recordId }, { recordId, ...record }, { upsert: true, returnDocument: 'after' }).lean();
        return safe({ id: d.recordId, userId: d.userId, date: d.date ?? null, checkIn: d.checkIn ?? null, checkOut: d.checkOut ?? null, status: d.status, notes: d.notes ?? null, breakSessions: (d.breakSessions ?? []).map(b => ({ start: b.start, end: b.end ?? null })) });
    });
    ipcMain.handle('db:attendance:delete', async (_e, userId, date) => { await AttendanceModel.deleteOne({ recordId: `${userId}-${date}` }); return true; });

    // Messages
    const toMsg = d => ({ id: d.msgId, from: d.fromId, to: d.toId, text: d.text, time: d.timestamp, read: false, reactions: d.reactions ? Object.fromEntries(Object.entries(d.reactions)) : {}, deleted: d.deleted ?? false });

    ipcMain.handle('db:messages:getBetween', async (_e, userId, peerId) => {
        const msgs = await MessageModel.find({ $or: [{ fromId: userId, toId: peerId }, { fromId: peerId, toId: userId }] }).sort({ timestamp: 1 }).lean();
        return safe(msgs.map(toMsg));
    });
    ipcMain.handle('db:messages:send', async (_e, msg) => {
        const d = await MessageModel.create({ msgId: `m${Date.now()}`, ...msg });
        return safe(toMsg(d.toObject()));
    });
    ipcMain.handle('db:messages:react', async (_e, msgId, userId, emoji) => {
        const msg = await MessageModel.findOne({ msgId }).lean();
        if (!msg) return null;
        const reactions = msg.reactions ? Object.fromEntries(Object.entries(msg.reactions)) : {};
        const users = reactions[emoji] ?? [];
        if (users.includes(userId)) reactions[emoji] = users.filter(u => u !== userId);
        else reactions[emoji] = [...users, userId];
        const d = await MessageModel.findOneAndUpdate({ msgId }, { reactions }, { returnDocument: 'after' }).lean();
        return d ? safe(toMsg(d)) : null;
    });
    ipcMain.handle('db:messages:delete', async (_e, msgId) => {
        await MessageModel.findOneAndUpdate({ msgId }, { deleted: true });
        return true;
    });

    // Conv meta (pin/star/archive)
    const toConvMeta = d => ({ convId: d.convId, userId: d.userId, peerId: d.peerId, pinned: d.pinned ?? false, starred: d.starred ?? false, archived: d.archived ?? false });

    ipcMain.handle('db:convmeta:getAll', async (_e, userId) => {
        const docs = await ConvMetaModel.find({ userId }).lean();
        return safe(docs.map(toConvMeta));
    });
    ipcMain.handle('db:convmeta:set', async (_e, meta) => {
        const convId = `${meta.userId}-${meta.peerId}`;
        const d = await ConvMetaModel.findOneAndUpdate({ convId }, { convId, ...meta }, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toConvMeta(d));
    });

    // Departments
    const toDept = d => ({ id: d.deptId, name: d.name, color: d.color, memberIds: (d.memberIds ?? []).map(String) });

    ipcMain.handle('db:depts:getAll', async () => safe((await DeptModel.find().lean()).map(toDept)));
    ipcMain.handle('db:depts:create', async (_e, dept) => { const d = await DeptModel.create({ deptId: `dept${Date.now()}`, ...dept }); return safe(toDept(d.toObject())); });
    ipcMain.handle('db:depts:update', async (_e, id, changes) => { const d = await DeptModel.findOneAndUpdate({ deptId: id }, changes, { returnDocument: 'after' }).lean(); return d ? safe(toDept(d)) : null; });
    ipcMain.handle('db:depts:delete', async (_e, id) => { await DeptModel.deleteOne({ deptId: id }); return true; });

    // Project rich data
    const toProjectRich = d => ({ projectId: d.projectId, description: d.description ?? '', status: d.status, priority: d.priority, memberIds: Array.from(d.memberIds ?? []), dueDate: d.dueDate ?? '', starred: d.starred ?? false, category: d.category ?? 'General' });

    ipcMain.handle('db:projectrich:getAll', async () => safe((await ProjectRichModel.find().lean()).map(toProjectRich)));
    ipcMain.handle('db:projectrich:set', async (_e, data) => {
        const d = await ProjectRichModel.findOneAndUpdate({ projectId: data.projectId }, data, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toProjectRich(d));
    });
    ipcMain.handle('db:projectrich:delete', async (_e, projectId) => {
        await ProjectRichModel.deleteOne({ projectId });
        return true;
    });

    // Auth — credentials stored in MongoDB
    const toAuthUser = d => ({ id: d.appId, name: d.name, email: d.email, role: d.role });

    ipcMain.handle('db:auth:login', async (_e, email, password) => {
        const found = await AuthUserModel.findOne({ email: email.toLowerCase() }).lean();
        if (!found || found.password !== password) throw new Error('Invalid email or password.');
        return safe(toAuthUser(found));
    });

    ipcMain.handle('db:auth:register', async (_e, name, email, password, role) => {
        const existing = await AuthUserModel.findOne({ email: email.toLowerCase() }).lean();
        if (existing) throw new Error('An account with this email already exists.');
        const d = await AuthUserModel.create({ appId: `auth-${Date.now()}`, name, email: email.toLowerCase(), password, role });
        return safe(toAuthUser(d.toObject()));
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

    ipcMain.handle('db:auth:getAll', async () => {
        const docs = await AuthUserModel.find().lean();
        return safe(docs.map(d => ({ id: d.appId, name: d.name, email: d.email, role: d.role })));
    });

    ipcMain.handle('db:auth:updateRole', async (_e, userId, role) => {
        await AuthUserModel.findOneAndUpdate({ appId: userId }, { role });
        return true;
    });

    ipcMain.handle('db:auth:seedDefault', async () => {
        // Legacy default account
        const existing = await AuthUserModel.findOne({ email: 'admin@projectm.com' }).lean();
        if (!existing) {
            await AuthUserModel.create({ appId: 'auth-default', name: 'Admin User', email: 'admin@projectm.com', password: 'password123', role: 'admin' });
        }
        // Toursurv admin account
        const adminExists = await AuthUserModel.findOne({ email: 'admin@gmail.com' }).lean();
        if (!adminExists) {
            await AuthUserModel.create({ appId: 'auth-toursurv-admin', name: 'Admin', email: 'admin@gmail.com', password: 'Admin@123', role: 'admin' });
        }
        // Toursurv organization
        const orgExists = await OrgModel.findOne({ orgId: 'org-toursurv' }).lean();
        if (!orgExists) {
            await OrgModel.create({ orgId: 'org-toursurv', name: 'Toursurv', workStart: '09:00', workEnd: '18:00', createdAt: new Date().toISOString() });
        }
        // Default role permissions — always upsert admin to ensure new routes are included
        const defaultPerms = [
            { role: 'admin',   allowedRoutes: ['/', '/dashboard', '/messages', '/tasks', '/teams', '/members', '/attendance', '/reports', '/organization', '/settings'] },
            { role: 'manager', allowedRoutes: ['/', '/dashboard', '/messages', '/tasks', '/teams', '/attendance', '/settings'] },
            { role: 'member',  allowedRoutes: ['/settings'] },
        ];
        for (const p of defaultPerms) {
            if (p.role === 'admin') {
                // Always update admin to include any newly added routes
                await RolePermsModel.findOneAndUpdate({ role: 'admin' }, { allowedRoutes: p.allowedRoutes }, { upsert: true });
            } else {
                const exists = await RolePermsModel.findOne({ role: p.role }).lean();
                if (!exists) await RolePermsModel.create(p);
            }
        }
        // Seed default roles if none exist
        const roleCount = await RoleModel.countDocuments();
        if (roleCount === 0) {
            await RoleModel.insertMany([
                { appId: 'role_admin',   name: 'admin',   color: '#5030E5' },
                { appId: 'role_manager', name: 'manager', color: '#D97706' },
                { appId: 'role_member',  name: 'member',  color: '#9CA3AF' },
            ]);
        }
    });

    // Organization
    const toOrg = d => ({ id: d.orgId, name: d.name, logo: d.logo ?? '', address: d.address ?? '', workStart: d.workStart ?? '09:00', workEnd: d.workEnd ?? '18:00', createdAt: d.createdAt ?? '' });
    ipcMain.handle('db:org:get', async () => {
        const d = await OrgModel.findOne().lean();
        return d ? safe(toOrg(d)) : null;
    });
    ipcMain.handle('db:org:set', async (_e, data) => {
        const d = await OrgModel.findOneAndUpdate({ orgId: data.id ?? 'org-toursurv' }, { ...data, orgId: data.id ?? 'org-toursurv' }, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toOrg(d));
    });

    // Role permissions
    ipcMain.handle('db:roleperms:getAll', async () => {
        const docs = await RolePermsModel.find().lean();
        return safe(docs.map(d => ({ role: d.role, allowedRoutes: d.allowedRoutes ?? [] })));
    });
    ipcMain.handle('db:roleperms:set', async (_e, data) => {
        // data: { role, allowedRoutes }
        const d = await RolePermsModel.findOneAndUpdate({ role: data.role }, { allowedRoutes: data.allowedRoutes }, { upsert: true, returnDocument: 'after' }).lean();
        return safe({ role: d.role, allowedRoutes: d.allowedRoutes ?? [] });
    });

    // Roles (dynamic role management)
    ipcMain.handle('db:roles:getAll', async () => {
        const docs = await RoleModel.find().lean();
        return safe(docs.map(toRole));
    });

    ipcMain.handle('db:roles:create', async (_e, data) => {
        if (data.name === 'admin') throw new Error('Cannot create a role named admin.');
        const existing = await RoleModel.findOne({ name: data.name }).lean();
        if (existing) throw new Error(`Role "${data.name}" already exists.`);
        const d = await RoleModel.create({ appId: `role_${Date.now()}`, name: data.name, color: data.color });
        return safe(toRole(d.toObject()));
    });

    ipcMain.handle('db:roles:updateColor', async (_e, data) => {
        const d = await RoleModel.findOneAndUpdate({ appId: data.appId }, { color: data.color }, { returnDocument: 'after' }).lean();
        if (!d) throw new Error('Role not found.');
        return safe(toRole(d));
    });

    ipcMain.handle('db:roles:rename', async (_e, data) => {
        const role = await RoleModel.findOne({ appId: data.appId }).lean();
        if (!role) throw new Error('Role not found.');
        if (role.name === 'admin') throw new Error('Cannot rename the admin role.');
        const conflict = await RoleModel.findOne({ name: data.newName }).lean();
        if (conflict) throw new Error(`Role "${data.newName}" already exists.`);
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

    ipcMain.handle('db:roles:delete', async (_e, data) => {
        const role = await RoleModel.findOne({ appId: data.appId }).lean();
        if (!role) throw new Error('Role not found.');
        if (role.name === 'admin') throw new Error('Cannot delete the admin role.');
        await RoleModel.deleteOne({ appId: data.appId });
        return safe({ ok: true });
    });

    ipcMain.handle('db:roleperms:delete', async (_e, data) => {
        await RolePermsModel.deleteOne({ role: data.roleName });
        return safe({ ok: true });
    });

    // User preferences
    const toUserPref = d => ({
        userId: d.userId, theme: d.theme, sidebarCollapsed: d.sidebarCollapsed ?? false,
        selectedWeekStart: d.selectedWeekStart ?? null, hasSeenWalkthrough: d.hasSeenWalkthrough ?? false,
        projectsView: d.projectsView ?? 'grid',
    });
    ipcMain.handle('db:userpref:get', async (_e, userId) => {
        const d = await UserPrefModel.findOne({ userId }).lean();
        return d ? safe(toUserPref(d)) : null;
    });
    ipcMain.handle('db:userpref:set', async (_e, prefs) => {
        const d = await UserPrefModel.findOneAndUpdate({ userId: prefs.userId }, prefs, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toUserPref(d));
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
        return d ? safe(toNotifPref(d)) : null;
    });
    ipcMain.handle('db:notifpref:set', async (_e, prefs) => {
        const d = await NotifPrefModel.findOneAndUpdate({ userId: prefs.userId }, prefs, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toNotifPref(d));
    });

    // Appearance preferences
    const toAppearancePref = d => ({
        userId: d.userId, themeMode: d.themeMode, accentColor: d.accentColor,
        fontSize: d.fontSize, compactMode: d.compactMode ?? false,
    });
    ipcMain.handle('db:appearancepref:get', async (_e, userId) => {
        const d = await AppearancePrefModel.findOne({ userId }).lean();
        return d ? safe(toAppearancePref(d)) : null;
    });
    ipcMain.handle('db:appearancepref:set', async (_e, prefs) => {
        const d = await AppearancePrefModel.findOneAndUpdate({ userId: prefs.userId }, prefs, { upsert: true, returnDocument: 'after' }).lean();
        return safe(toAppearancePref(d));
    });

    // Notifications
    const toNotif = d => ({ id: d.notifId, userId: d.userId, type: d.type, title: d.title, body: d.body ?? '', refId: d.refId ?? '', read: d.read ?? false, createdAt: d.createdAt });
    ipcMain.handle('db:notifs:getAll', async (_e, userId) => {
        const docs = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
        return safe(docs.map(toNotif));
    });
    ipcMain.handle('db:notifs:create', async (_e, notif) => {
        const notifId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const d = await NotificationModel.create({ notifId, ...notif, createdAt: new Date().toISOString() });
        return safe(toNotif(d.toObject()));
    });
    ipcMain.handle('db:notifs:markRead', async (_e, notifId) => {
        await NotificationModel.updateOne({ notifId }, { read: true });
        return true;
    });
    ipcMain.handle('db:notifs:markAllRead', async (_e, userId) => {
        await NotificationModel.updateMany({ userId, read: false }, { read: true });
        return true;
    });
    ipcMain.handle('db:notifs:deleteOld', async (_e, userId) => {
        const all = await NotificationModel.find({ userId }).sort({ createdAt: -1 }).lean();
        if (all.length > 100) {
            const toDelete = all.slice(100).map(d => d.notifId);
            await NotificationModel.deleteMany({ notifId: { $in: toDelete } });
        }
        return true;
    });
}

// ─── Auto Updater ─────────────────────────────────────────────────────────────

let mainWindow = null;
let autoUpdater = null;

if (!process.env.VITE_DEV_SERVER_URL) {
    try { autoUpdater = require('electron-updater').autoUpdater; } catch {}
}

function checkForUpdates() {
    if (!mainWindow) return;
    if (!autoUpdater) {
        // Running in dev mode — autoUpdater is disabled
        mainWindow.webContents.send('update:error', 'Auto-updater is not available in development mode.');
        return;
    }
    autoUpdater.checkForUpdates().catch(err => {
        console.error('Update check failed:', err);
        mainWindow?.webContents.send('update:error', err.message);
    });
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
        icon: path.join(__dirname, '../build/icon.icns'),
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
