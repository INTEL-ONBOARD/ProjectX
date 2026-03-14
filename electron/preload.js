'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,

    // App info
    getVersion: () => ipcRenderer.invoke('app:version'),

    // Update controls
    checkForUpdate: () => ipcRenderer.invoke('update:check'),
    installUpdate: () => ipcRenderer.invoke('update:install'),

    // Update event listeners
    onUpdateChecking: (cb) => { ipcRenderer.on('update:checking', cb); return () => ipcRenderer.removeListener('update:checking', cb); },
    onUpdateAvailable: (cb) => { ipcRenderer.on('update:available', cb); return () => ipcRenderer.removeListener('update:available', cb); },
    onUpdateNotAvailable: (cb) => { ipcRenderer.on('update:not-available', cb); return () => ipcRenderer.removeListener('update:not-available', cb); },
    onDownloadProgress: (cb) => { ipcRenderer.on('update:download-progress', cb); return () => ipcRenderer.removeListener('update:download-progress', cb); },
    onUpdateDownloaded: (cb) => { ipcRenderer.on('update:downloaded', cb); return () => ipcRenderer.removeListener('update:downloaded', cb); },
    onUpdateError: (cb) => { ipcRenderer.on('update:error', cb); return () => ipcRenderer.removeListener('update:error', cb); },

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
        moveTask: (id, newStatus) => ipcRenderer.invoke('db:tasks:move', id, newStatus),
        scrubAssignee: (memberId) => ipcRenderer.invoke('db:tasks:scrubAssignee', memberId),

        // Members
        getMembers: () => ipcRenderer.invoke('db:members:getAll'),
        addMember: (member) => ipcRenderer.invoke('db:members:add', member),
        removeMember: (id) => ipcRenderer.invoke('db:members:remove', id),

        // Attendance
        getAttendance: () => ipcRenderer.invoke('db:attendance:getAll'),
        setAttendance: (record) => ipcRenderer.invoke('db:attendance:set', record),
        deleteAttendance: (userId, date) => ipcRenderer.invoke('db:attendance:delete', userId, date),
    },
});
