"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    // App info
    getVersion: () => electron_1.ipcRenderer.invoke('app:version'),
    openExternal: (url) => electron_1.ipcRenderer.invoke('app:openExternal', url),
    // Update controls
    checkForUpdate: () => electron_1.ipcRenderer.invoke('update:check'),
    installUpdate: () => electron_1.ipcRenderer.invoke('update:install'),
    // DB connection event listeners
    onDbConnected: (cb) => {
        electron_1.ipcRenderer.on('db:connected', cb);
        return () => electron_1.ipcRenderer.removeListener('db:connected', cb);
    },
    onDbConnectionFailed: (cb) => {
        electron_1.ipcRenderer.on('db:connection-failed', cb);
        return () => electron_1.ipcRenderer.removeListener('db:connection-failed', cb);
    },
    onDbDisconnected: (cb) => {
        electron_1.ipcRenderer.on('db:disconnected', cb);
        return () => electron_1.ipcRenderer.removeListener('db:disconnected', cb);
    },
    onDbReconnected: (cb) => {
        electron_1.ipcRenderer.on('db:reconnected', cb);
        return () => electron_1.ipcRenderer.removeListener('db:reconnected', cb);
    },
    onNewMessage: (cb) => {
        electron_1.ipcRenderer.on('msg:new', cb);
        return () => electron_1.ipcRenderer.removeListener('msg:new', cb);
    },
    // Update event listeners
    onUpdateChecking: (cb) => {
        electron_1.ipcRenderer.on('update:checking', cb);
        return () => electron_1.ipcRenderer.removeListener('update:checking', cb);
    },
    onUpdateAvailable: (cb) => {
        electron_1.ipcRenderer.on('update:available', cb);
        return () => electron_1.ipcRenderer.removeListener('update:available', cb);
    },
    onUpdateNotAvailable: (cb) => {
        electron_1.ipcRenderer.on('update:not-available', cb);
        return () => electron_1.ipcRenderer.removeListener('update:not-available', cb);
    },
    onDownloadProgress: (cb) => {
        electron_1.ipcRenderer.on('update:download-progress', cb);
        return () => electron_1.ipcRenderer.removeListener('update:download-progress', cb);
    },
    onUpdateDownloaded: (cb) => {
        electron_1.ipcRenderer.on('update:downloaded', cb);
        return () => electron_1.ipcRenderer.removeListener('update:downloaded', cb);
    },
    onUpdateError: (cb) => {
        electron_1.ipcRenderer.on('update:error', cb);
        return () => electron_1.ipcRenderer.removeListener('update:error', cb);
    },
    // User preferences (theme, sidebar, week start, walkthrough, view)
    userPrefs: {
        get: (userId) => electron_1.ipcRenderer.invoke('db:userpref:get', userId),
        set: (prefs) => electron_1.ipcRenderer.invoke('db:userpref:set', prefs),
    },
    // Notification preferences
    notifPrefs: {
        get: (userId) => electron_1.ipcRenderer.invoke('db:notifpref:get', userId),
        set: (prefs) => electron_1.ipcRenderer.invoke('db:notifpref:set', prefs),
    },
    // Notifications
    notifs: {
        getAll: (userId) => electron_1.ipcRenderer.invoke('db:notifs:getAll', userId),
        create: (notif) => electron_1.ipcRenderer.invoke('db:notifs:create', notif),
        markRead: (notifId) => electron_1.ipcRenderer.invoke('db:notifs:markRead', notifId),
        markAllRead: (userId) => electron_1.ipcRenderer.invoke('db:notifs:markAllRead', userId),
        deleteOld: (userId) => electron_1.ipcRenderer.invoke('db:notifs:deleteOld', userId),
    },
    // Appearance preferences
    appearancePrefs: {
        get: (userId) => electron_1.ipcRenderer.invoke('db:appearancepref:get', userId),
        set: (prefs) => electron_1.ipcRenderer.invoke('db:appearancepref:set', prefs),
    },
    // Auth — credentials stored in MongoDB Atlas
    auth: {
        login: (email, password) => electron_1.ipcRenderer.invoke('db:auth:login', email, password),
        register: (name, email, password, role, orgId) => electron_1.ipcRenderer.invoke('db:auth:register', name, email, password, role, orgId),
        updatePassword: (userId, currentPassword, newPassword) => electron_1.ipcRenderer.invoke('db:auth:updatePassword', userId, currentPassword, newPassword),
        updateName: (userId, newName) => electron_1.ipcRenderer.invoke('db:auth:updateName', userId, newName),
        seedDefault: () => electron_1.ipcRenderer.invoke('db:auth:seedDefault'),
        getAll: () => electron_1.ipcRenderer.invoke('db:auth:getAll'),
        updateRole: (userId, role) => electron_1.ipcRenderer.invoke('db:auth:updateRole', userId, role),
    },
    // Database — all operations go through Electron main → MongoDB Atlas
    db: {
        // Projects
        getProjects: () => electron_1.ipcRenderer.invoke('db:projects:getAll'),
        createProject: (name, color) => electron_1.ipcRenderer.invoke('db:projects:create', name, color),
        updateProject: (id, changes) => electron_1.ipcRenderer.invoke('db:projects:update', id, changes),
        deleteProject: (id) => electron_1.ipcRenderer.invoke('db:projects:delete', id),
        // Tasks
        getTasks: () => electron_1.ipcRenderer.invoke('db:tasks:getAll'),
        createTask: (task) => electron_1.ipcRenderer.invoke('db:tasks:create', task),
        updateTask: (id, changes) => electron_1.ipcRenderer.invoke('db:tasks:update', id, changes),
        deleteTask: (id) => electron_1.ipcRenderer.invoke('db:tasks:delete', id),
        moveTask: (id, newStatus, actorId, actorName) => electron_1.ipcRenderer.invoke('db:tasks:move', id, newStatus, actorId, actorName),
        scrubAssignee: (memberId) => electron_1.ipcRenderer.invoke('db:tasks:scrubAssignee', memberId),
        // Members
        getMembers: () => electron_1.ipcRenderer.invoke('db:members:getAll'),
        addMember: (member) => electron_1.ipcRenderer.invoke('db:members:add', member),
        updateMember: (id, changes) => electron_1.ipcRenderer.invoke('db:members:update', id, changes),
        updateMemberRole: (id, role) => electron_1.ipcRenderer.invoke('db:members:updateRole', id, role),
        removeMember: (id) => electron_1.ipcRenderer.invoke('db:members:remove', id),
        // Attendance
        getAttendance: () => electron_1.ipcRenderer.invoke('db:attendance:getAll'),
        setAttendance: (record) => electron_1.ipcRenderer.invoke('db:attendance:set', record),
        deleteAttendance: (userId, date) => electron_1.ipcRenderer.invoke('db:attendance:delete', userId, date),
        // Messages
        getMessagesBetween: (userId, peerId) => electron_1.ipcRenderer.invoke('db:messages:getBetween', userId, peerId),
        sendMessage: (msg) => electron_1.ipcRenderer.invoke('db:messages:send', msg),
        reactToMessage: (msgId, userId, emoji) => electron_1.ipcRenderer.invoke('db:messages:react', msgId, userId, emoji),
        deleteMessage: (msgId) => electron_1.ipcRenderer.invoke('db:messages:delete', msgId),
        markMessagesRead: (userId, peerId) => electron_1.ipcRenderer.invoke('db:messages:markRead', userId, peerId),
        // Conv meta
        getConvMeta: (userId) => electron_1.ipcRenderer.invoke('db:convmeta:getAll', userId),
        setConvMeta: (meta) => electron_1.ipcRenderer.invoke('db:convmeta:set', meta),
        // Departments
        getDepts: () => electron_1.ipcRenderer.invoke('db:depts:getAll'),
        createDept: (dept) => electron_1.ipcRenderer.invoke('db:depts:create', dept),
        updateDept: (id, changes) => electron_1.ipcRenderer.invoke('db:depts:update', id, changes),
        deleteDept: (id) => electron_1.ipcRenderer.invoke('db:depts:delete', id),
        // Project rich data
        getProjectRich: () => electron_1.ipcRenderer.invoke('db:projectrich:getAll'),
        setProjectRich: (data) => electron_1.ipcRenderer.invoke('db:projectrich:set', data),
        deleteProjectRich: (projectId) => electron_1.ipcRenderer.invoke('db:projectrich:delete', projectId),
        // Organization
        getOrg: () => electron_1.ipcRenderer.invoke('db:org:get'),
        setOrg: (data) => electron_1.ipcRenderer.invoke('db:org:set', data),
        listOrgs: () => electron_1.ipcRenderer.invoke('db:org:list'),
        // Role permissions
        getRolePerms: () => electron_1.ipcRenderer.invoke('db:roleperms:getAll'),
        setRolePerms: (data) => electron_1.ipcRenderer.invoke('db:roleperms:set', data),
        // Roles (dynamic)
        getRoles: () => electron_1.ipcRenderer.invoke('db:roles:getAll'),
        createRole: (data) => electron_1.ipcRenderer.invoke('db:roles:create', data),
        updateRoleColor: (data) => electron_1.ipcRenderer.invoke('db:roles:updateColor', data),
        renameRole: (data) => electron_1.ipcRenderer.invoke('db:roles:rename', data),
        deleteRole: (data) => electron_1.ipcRenderer.invoke('db:roles:delete', data),
        deleteRolePerms: (data) => electron_1.ipcRenderer.invoke('db:roleperms:delete', data),
        // Presence
        heartbeat: (userId) => electron_1.ipcRenderer.invoke('db:presence:heartbeat', userId),
    },
});
