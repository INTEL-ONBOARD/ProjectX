'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,

    // App info
    getVersion: () => ipcRenderer.invoke('app:version'),

    // Update controls
    checkForUpdate: () => ipcRenderer.invoke('update:check'),
    installUpdate: () => ipcRenderer.invoke('update:install'),

    // DB connection event listeners
    onDbConnected: (cb) => { ipcRenderer.on('db:connected', cb); return () => ipcRenderer.removeListener('db:connected', cb); },
    onDbConnectionFailed: (cb) => { ipcRenderer.on('db:connection-failed', cb); return () => ipcRenderer.removeListener('db:connection-failed', cb); },
    onNewMessage: (cb) => {
        ipcRenderer.on('msg:new', cb);
        return () => ipcRenderer.removeListener('msg:new', cb);
    },

    // Update event listeners
    onUpdateChecking: (cb) => { ipcRenderer.on('update:checking', cb); return () => ipcRenderer.removeListener('update:checking', cb); },
    onUpdateAvailable: (cb) => { ipcRenderer.on('update:available', cb); return () => ipcRenderer.removeListener('update:available', cb); },
    onUpdateNotAvailable: (cb) => { ipcRenderer.on('update:not-available', cb); return () => ipcRenderer.removeListener('update:not-available', cb); },
    onDownloadProgress: (cb) => { ipcRenderer.on('update:download-progress', cb); return () => ipcRenderer.removeListener('update:download-progress', cb); },
    onUpdateDownloaded: (cb) => { ipcRenderer.on('update:downloaded', cb); return () => ipcRenderer.removeListener('update:downloaded', cb); },
    onUpdateError: (cb) => { ipcRenderer.on('update:error', cb); return () => ipcRenderer.removeListener('update:error', cb); },

    // User preferences (theme, sidebar, week start, walkthrough, view)
    userPrefs: {
        get: (userId)  => ipcRenderer.invoke('db:userpref:get', userId),
        set: (prefs)   => ipcRenderer.invoke('db:userpref:set', prefs),
    },

    // Notification preferences
    notifPrefs: {
        get: (userId)  => ipcRenderer.invoke('db:notifpref:get', userId),
        set: (prefs)   => ipcRenderer.invoke('db:notifpref:set', prefs),
    },

    // Notifications
    notifs: {
        getAll:      (userId)  => ipcRenderer.invoke('db:notifs:getAll', userId),
        create:      (notif)   => ipcRenderer.invoke('db:notifs:create', notif),
        markRead:    (notifId) => ipcRenderer.invoke('db:notifs:markRead', notifId),
        markAllRead: (userId)  => ipcRenderer.invoke('db:notifs:markAllRead', userId),
        deleteOld:   (userId)  => ipcRenderer.invoke('db:notifs:deleteOld', userId),
    },

    // Appearance preferences
    appearancePrefs: {
        get: (userId)  => ipcRenderer.invoke('db:appearancepref:get', userId),
        set: (prefs)   => ipcRenderer.invoke('db:appearancepref:set', prefs),
    },

    // Auth — credentials stored in MongoDB Atlas
    auth: {
        login:          (email, password)                    => ipcRenderer.invoke('db:auth:login', email, password),
        register:       (name, email, password, role)        => ipcRenderer.invoke('db:auth:register', name, email, password, role),
        updatePassword: (userId, currentPassword, newPassword) => ipcRenderer.invoke('db:auth:updatePassword', userId, currentPassword, newPassword),
        updateName:     (userId, newName)                    => ipcRenderer.invoke('db:auth:updateName', userId, newName),
        seedDefault:    ()                                   => ipcRenderer.invoke('db:auth:seedDefault'),
        getAll:         ()                                   => ipcRenderer.invoke('db:auth:getAll'),
        updateRole:     (userId, role)                       => ipcRenderer.invoke('db:auth:updateRole', userId, role),
    },

    // Database — all operations go through Electron main → MongoDB Atlas
    db: {
        // Projects
        getProjects: () => ipcRenderer.invoke('db:projects:getAll'),
        createProject: (name, color) => ipcRenderer.invoke('db:projects:create', name, color),
        updateProject: (id, changes) => ipcRenderer.invoke('db:projects:update', id, changes),
        deleteProject: (id) => ipcRenderer.invoke('db:projects:delete', id),

        // Tasks
        getTasks: () => ipcRenderer.invoke('db:tasks:getAll'),
        createTask: (task) => ipcRenderer.invoke('db:tasks:create', task),
        updateTask: (id, changes) => ipcRenderer.invoke('db:tasks:update', id, changes),
        deleteTask: (id) => ipcRenderer.invoke('db:tasks:delete', id),
        moveTask: (id, newStatus, actorId, actorName) => ipcRenderer.invoke('db:tasks:move', id, newStatus, actorId, actorName),
        scrubAssignee: (memberId) => ipcRenderer.invoke('db:tasks:scrubAssignee', memberId),

        // Members
        getMembers: () => ipcRenderer.invoke('db:members:getAll'),
        addMember: (member) => ipcRenderer.invoke('db:members:add', member),
        updateMember:     (id, changes) => ipcRenderer.invoke('db:members:update', id, changes),
        updateMemberRole: (id, role)    => ipcRenderer.invoke('db:members:updateRole', id, role),
        removeMember:     (id)          => ipcRenderer.invoke('db:members:remove', id),

        // Attendance
        getAttendance: () => ipcRenderer.invoke('db:attendance:getAll'),
        setAttendance: (record) => ipcRenderer.invoke('db:attendance:set', record),
        deleteAttendance: (userId, date) => ipcRenderer.invoke('db:attendance:delete', userId, date),

        // Messages
        getMessagesBetween: (userId, peerId) => ipcRenderer.invoke('db:messages:getBetween', userId, peerId),
        sendMessage: (msg) => ipcRenderer.invoke('db:messages:send', msg),
        reactToMessage: (msgId, userId, emoji) => ipcRenderer.invoke('db:messages:react', msgId, userId, emoji),
        deleteMessage: (msgId) => ipcRenderer.invoke('db:messages:delete', msgId),
        // Conv meta
        getConvMeta: (userId) => ipcRenderer.invoke('db:convmeta:getAll', userId),
        setConvMeta: (meta) => ipcRenderer.invoke('db:convmeta:set', meta),

        // Departments
        getDepts: () => ipcRenderer.invoke('db:depts:getAll'),
        createDept: (dept) => ipcRenderer.invoke('db:depts:create', dept),
        updateDept: (id, changes) => ipcRenderer.invoke('db:depts:update', id, changes),
        deleteDept: (id) => ipcRenderer.invoke('db:depts:delete', id),

        // Project rich data
        getProjectRich: () => ipcRenderer.invoke('db:projectrich:getAll'),
        setProjectRich: (data) => ipcRenderer.invoke('db:projectrich:set', data),
        deleteProjectRich: (projectId) => ipcRenderer.invoke('db:projectrich:delete', projectId),

        // Organization
        getOrg: () => ipcRenderer.invoke('db:org:get'),
        setOrg: (data) => ipcRenderer.invoke('db:org:set', data),

        // Role permissions
        getRolePerms: () => ipcRenderer.invoke('db:roleperms:getAll'),
        setRolePerms: (data) => ipcRenderer.invoke('db:roleperms:set', data),

        // Roles (dynamic)
        getRoles:        ()     => ipcRenderer.invoke('db:roles:getAll'),
        createRole:      (data) => ipcRenderer.invoke('db:roles:create', data),
        updateRoleColor: (data) => ipcRenderer.invoke('db:roles:updateColor', data),
        renameRole:      (data) => ipcRenderer.invoke('db:roles:rename', data),
        deleteRole:      (data) => ipcRenderer.invoke('db:roles:delete', data),
        deleteRolePerms: (data) => ipcRenderer.invoke('db:roleperms:delete', data),

        // Presence
        heartbeat: (userId) => ipcRenderer.invoke('db:presence:heartbeat', userId),
    },
});
