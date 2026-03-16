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

    // DB connection event listeners
    onDbConnected: (cb: () => void) => {
        ipcRenderer.on('db:connected', cb);
        return () => ipcRenderer.removeListener('db:connected', cb);
    },
    onDbConnectionFailed: (cb: (_: unknown, message: string) => void) => {
        ipcRenderer.on('db:connection-failed', cb);
        return () => ipcRenderer.removeListener('db:connection-failed', cb);
    },
    onDbDisconnected: (cb: () => void) => {
        ipcRenderer.on('db:disconnected', cb);
        return () => ipcRenderer.removeListener('db:disconnected', cb);
    },
    onDbReconnected: (cb: () => void) => {
        ipcRenderer.on('db:reconnected', cb);
        return () => ipcRenderer.removeListener('db:reconnected', cb);
    },
    onNewMessage: (cb: (_: unknown, msg: { id: string; from: string; to: string; text: string; time: string; read: boolean; reactions: Record<string, unknown>; deleted: boolean }) => void) => {
        ipcRenderer.on('msg:new', cb);
        return () => ipcRenderer.removeListener('msg:new', cb);
    },

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

    // User preferences (theme, sidebar, week start, walkthrough, view)
    userPrefs: {
        get: (userId: string) => ipcRenderer.invoke('db:userpref:get', userId),
        set: (prefs: object)  => ipcRenderer.invoke('db:userpref:set', prefs),
    },

    // Notification preferences
    notifPrefs: {
        get: (userId: string) => ipcRenderer.invoke('db:notifpref:get', userId),
        set: (prefs: object)  => ipcRenderer.invoke('db:notifpref:set', prefs),
    },

    // Notifications
    notifs: {
        getAll:      (userId: string): Promise<unknown[]> => ipcRenderer.invoke('db:notifs:getAll', userId),
        create:      (notif: object): Promise<unknown>    => ipcRenderer.invoke('db:notifs:create', notif),
        markRead:    (notifId: string): Promise<boolean>  => ipcRenderer.invoke('db:notifs:markRead', notifId),
        markAllRead: (userId: string): Promise<boolean>   => ipcRenderer.invoke('db:notifs:markAllRead', userId),
        deleteOld:   (userId: string): Promise<boolean>   => ipcRenderer.invoke('db:notifs:deleteOld', userId),
    },

    // Appearance preferences
    appearancePrefs: {
        get: (userId: string) => ipcRenderer.invoke('db:appearancepref:get', userId),
        set: (prefs: object)  => ipcRenderer.invoke('db:appearancepref:set', prefs),
    },

    // Auth — credentials stored in MongoDB Atlas
    auth: {
        login:          (email: string, password: string)                                  => ipcRenderer.invoke('db:auth:login', email, password),
        register:       (name: string, email: string, password: string, role: string, orgId?: string) => ipcRenderer.invoke('db:auth:register', name, email, password, role, orgId),
        updatePassword: (userId: string, currentPassword: string, newPassword: string)     => ipcRenderer.invoke('db:auth:updatePassword', userId, currentPassword, newPassword),
        updateName:     (userId: string, newName: string)                                  => ipcRenderer.invoke('db:auth:updateName', userId, newName),
        seedDefault:    ()                                                                 => ipcRenderer.invoke('db:auth:seedDefault'),
        getAll:         ()                                                                 => ipcRenderer.invoke('db:auth:getAll'),
        updateRole:     (userId: string, role: string)                                     => ipcRenderer.invoke('db:auth:updateRole', userId, role),
    },

    // Database — all operations go through Electron main → MongoDB Atlas
    db: {
        // Projects
        getProjects:   (): Promise<unknown[]>                                  => ipcRenderer.invoke('db:projects:getAll'),
        createProject: (name: string, color: string): Promise<unknown>         => ipcRenderer.invoke('db:projects:create', name, color),
        updateProject: (id: string, changes: { name?: string; color?: string }): Promise<unknown> => ipcRenderer.invoke('db:projects:update', id, changes),
        deleteProject: (id: string): Promise<boolean>                          => ipcRenderer.invoke('db:projects:delete', id),

        // Tasks
        getTasks:      (): Promise<unknown[]>                                  => ipcRenderer.invoke('db:tasks:getAll'),
        createTask:    (task: object): Promise<unknown>                        => ipcRenderer.invoke('db:tasks:create', task),
        updateTask:    (id: string, changes: object): Promise<unknown>         => ipcRenderer.invoke('db:tasks:update', id, changes),
        deleteTask:    (id: string): Promise<boolean>                          => ipcRenderer.invoke('db:tasks:delete', id),
        moveTask:      (id: string, newStatus: string, actorId?: string, actorName?: string): Promise<unknown> => ipcRenderer.invoke('db:tasks:move', id, newStatus, actorId, actorName),
        scrubAssignee: (memberId: string): Promise<boolean>                    => ipcRenderer.invoke('db:tasks:scrubAssignee', memberId),

        // Members
        getMembers:    (): Promise<unknown[]>                                  => ipcRenderer.invoke('db:members:getAll'),
        addMember:     (member: object): Promise<unknown>                      => ipcRenderer.invoke('db:members:add', member),
        updateMember:     (id: string, changes: object): Promise<unknown>         => ipcRenderer.invoke('db:members:update', id, changes),
        updateMemberRole: (id: string, role: string): Promise<unknown>           => ipcRenderer.invoke('db:members:updateRole', id, role),
        removeMember:     (id: string): Promise<boolean>                         => ipcRenderer.invoke('db:members:remove', id),

        // Attendance
        getAttendance:    (): Promise<unknown[]>                               => ipcRenderer.invoke('db:attendance:getAll'),
        setAttendance:    (record: object): Promise<unknown>                   => ipcRenderer.invoke('db:attendance:set', record),
        deleteAttendance: (userId: string, date: string): Promise<boolean>     => ipcRenderer.invoke('db:attendance:delete', userId, date),

        // Messages
        getMessagesBetween: (userId: string, peerId: string): Promise<unknown[]> => ipcRenderer.invoke('db:messages:getBetween', userId, peerId),
        sendMessage:        (msg: object): Promise<unknown>                       => ipcRenderer.invoke('db:messages:send', msg),
        reactToMessage:     (msgId: string, userId: string, emoji: string): Promise<unknown> => ipcRenderer.invoke('db:messages:react', msgId, userId, emoji),
        deleteMessage:      (msgId: string): Promise<boolean>                     => ipcRenderer.invoke('db:messages:delete', msgId),
        markMessagesRead:   (userId: string, peerId: string): Promise<boolean>    => ipcRenderer.invoke('db:messages:markRead', userId, peerId),

        // Conv meta
        getConvMeta: (userId: string): Promise<unknown[]>                      => ipcRenderer.invoke('db:convmeta:getAll', userId),
        setConvMeta: (meta: object): Promise<unknown>                          => ipcRenderer.invoke('db:convmeta:set', meta),

        // Departments
        getDepts:    (): Promise<unknown[]>                                    => ipcRenderer.invoke('db:depts:getAll'),
        createDept:  (dept: object): Promise<unknown>                          => ipcRenderer.invoke('db:depts:create', dept),
        updateDept:  (id: string, changes: object): Promise<unknown>           => ipcRenderer.invoke('db:depts:update', id, changes),
        deleteDept:  (id: string): Promise<boolean>                            => ipcRenderer.invoke('db:depts:delete', id),

        // Project rich data
        getProjectRich: (): Promise<unknown[]>                                 => ipcRenderer.invoke('db:projectrich:getAll'),
        setProjectRich: (data: object): Promise<unknown>                       => ipcRenderer.invoke('db:projectrich:set', data),
        deleteProjectRich: (projectId: string): Promise<boolean>               => ipcRenderer.invoke('db:projectrich:delete', projectId),

        // Organization
        getOrg:   (): Promise<unknown>                                         => ipcRenderer.invoke('db:org:get'),
        setOrg:   (data: object): Promise<unknown>                             => ipcRenderer.invoke('db:org:set', data),
        listOrgs: (): Promise<unknown[]>                                       => ipcRenderer.invoke('db:org:list'),

        // Role permissions
        getRolePerms: (): Promise<unknown[]>                                   => ipcRenderer.invoke('db:roleperms:getAll'),
        setRolePerms: (data: object): Promise<unknown>                         => ipcRenderer.invoke('db:roleperms:set', data),

        // Roles (dynamic)
        getRoles:        ():             Promise<unknown[]> => ipcRenderer.invoke('db:roles:getAll'),
        createRole:      (data: object): Promise<unknown>   => ipcRenderer.invoke('db:roles:create', data),
        updateRoleColor: (data: object): Promise<unknown>   => ipcRenderer.invoke('db:roles:updateColor', data),
        renameRole:      (data: object): Promise<unknown>   => ipcRenderer.invoke('db:roles:rename', data),
        deleteRole:      (data: object): Promise<unknown>   => ipcRenderer.invoke('db:roles:delete', data),
        deleteRolePerms: (data: object): Promise<unknown>   => ipcRenderer.invoke('db:roleperms:delete', data),

        // Presence
        heartbeat: (userId: string): Promise<boolean> => ipcRenderer.invoke('db:presence:heartbeat', userId),
    },
});
