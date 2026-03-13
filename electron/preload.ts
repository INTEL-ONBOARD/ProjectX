import { contextBridge, ipcRenderer } from 'electron';

export type UpdateInfo = {
    version: string;
    releaseDate?: string;
    releaseNotes?: string | null;
};

export type DownloadProgress = {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
};

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,

    // App info
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),

    // Update controls
    checkForUpdate: (): Promise<void> => ipcRenderer.invoke('update:check'),
    installUpdate: (): Promise<void> => ipcRenderer.invoke('update:install'),

    // Update event listeners
    onUpdateChecking: (cb: () => void) => {
        ipcRenderer.on('update:checking', cb);
        return () => ipcRenderer.removeListener('update:checking', cb);
    },
    onUpdateAvailable: (cb: (_: unknown, info: UpdateInfo) => void) => {
        ipcRenderer.on('update:available', cb);
        return () => ipcRenderer.removeListener('update:available', cb);
    },
    onUpdateNotAvailable: (cb: () => void) => {
        ipcRenderer.on('update:not-available', cb);
        return () => ipcRenderer.removeListener('update:not-available', cb);
    },
    onDownloadProgress: (cb: (_: unknown, progress: DownloadProgress) => void) => {
        ipcRenderer.on('update:download-progress', cb);
        return () => ipcRenderer.removeListener('update:download-progress', cb);
    },
    onUpdateDownloaded: (cb: (_: unknown, info: { version: string }) => void) => {
        ipcRenderer.on('update:downloaded', cb);
        return () => ipcRenderer.removeListener('update:downloaded', cb);
    },
    onUpdateError: (cb: (_: unknown, message: string) => void) => {
        ipcRenderer.on('update:error', cb);
        return () => ipcRenderer.removeListener('update:error', cb);
    },

    // Database — all operations go through Electron main → MongoDB Atlas
    db: {
        // Projects
        getProjects: (): Promise<unknown[]> => ipcRenderer.invoke('db:projects:getAll'),
        createProject: (name: string, color: string): Promise<unknown> => ipcRenderer.invoke('db:projects:create', name, color),
        updateProject: (id: string, changes: { name?: string; color?: string }): Promise<unknown> => ipcRenderer.invoke('db:projects:update', id, changes),
        deleteProject: (id: string): Promise<boolean> => ipcRenderer.invoke('db:projects:delete', id),

        // Tasks
        getTasks: (): Promise<unknown[]> => ipcRenderer.invoke('db:tasks:getAll'),
        createTask: (task: object): Promise<unknown> => ipcRenderer.invoke('db:tasks:create', task),
        updateTask: (id: string, changes: object): Promise<unknown> => ipcRenderer.invoke('db:tasks:update', id, changes),
        deleteTask: (id: string): Promise<boolean> => ipcRenderer.invoke('db:tasks:delete', id),
        moveTask: (id: string, newStatus: string): Promise<unknown> => ipcRenderer.invoke('db:tasks:move', id, newStatus),
        scrubAssignee: (memberId: string): Promise<boolean> => ipcRenderer.invoke('db:tasks:scrubAssignee', memberId),

        // Members
        getMembers: (): Promise<unknown[]> => ipcRenderer.invoke('db:members:getAll'),
        addMember: (member: object): Promise<unknown> => ipcRenderer.invoke('db:members:add', member),
        removeMember: (id: string): Promise<boolean> => ipcRenderer.invoke('db:members:remove', id),

        // Attendance
        getAttendance: (): Promise<unknown[]> => ipcRenderer.invoke('db:attendance:getAll'),
        setAttendance: (record: object): Promise<unknown> => ipcRenderer.invoke('db:attendance:set', record),
        deleteAttendance: (userId: string, date: string): Promise<boolean> => ipcRenderer.invoke('db:attendance:delete', userId, date),
    },
});
