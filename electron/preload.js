"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  // App info
  getVersion: () => import_electron.ipcRenderer.invoke("app:version"),
  openExternal: (url) => import_electron.ipcRenderer.invoke("app:openExternal", url),
  setTitleBarColor: (color, symbolColor) => import_electron.ipcRenderer.invoke("app:setTitleBarColor", color, symbolColor),
  getLoginItemSettings: () => import_electron.ipcRenderer.invoke("app:getLoginItemSettings"),
  setOpenAtLogin: (value) => import_electron.ipcRenderer.invoke("app:setOpenAtLogin", value),
  getBackgroundMode: () => import_electron.ipcRenderer.invoke("app:getBackgroundMode"),
  setBackgroundMode: (value) => import_electron.ipcRenderer.invoke("app:setBackgroundMode", value),
  setActiveUser: (userId) => import_electron.ipcRenderer.invoke("app:setActiveUser", userId),
  getSystemNotifsEnabled: (userId) => import_electron.ipcRenderer.invoke("app:getSystemNotifsEnabled", userId),
  setSystemNotifsEnabled: (userId, value) => import_electron.ipcRenderer.invoke("app:setSystemNotifsEnabled", userId, value),
  // Update controls
  checkForUpdate: () => import_electron.ipcRenderer.invoke("update:check"),
  installUpdate: () => import_electron.ipcRenderer.invoke("update:install"),
  forceReconnect: () => import_electron.ipcRenderer.invoke("db:force-reconnect"),
  // DB connection event listeners
  onDbConnected: (cb) => {
    import_electron.ipcRenderer.on("db:connected", cb);
    return () => import_electron.ipcRenderer.removeListener("db:connected", cb);
  },
  onDbConnectionFailed: (cb) => {
    import_electron.ipcRenderer.on("db:connection-failed", cb);
    return () => import_electron.ipcRenderer.removeListener("db:connection-failed", cb);
  },
  onDbDisconnected: (cb) => {
    import_electron.ipcRenderer.on("db:disconnected", cb);
    return () => import_electron.ipcRenderer.removeListener("db:disconnected", cb);
  },
  onDbReconnected: (cb) => {
    import_electron.ipcRenderer.on("db:reconnected", cb);
    return () => import_electron.ipcRenderer.removeListener("db:reconnected", cb);
  },
  onNewMessage: (cb) => {
    import_electron.ipcRenderer.on("msg:new", cb);
    return () => import_electron.ipcRenderer.removeListener("msg:new", cb);
  },
  // Fix 3: receive message updates (reactions, soft-deletes) from other clients
  onMessageUpdated: (cb) => {
    import_electron.ipcRenderer.on("msg:updated", cb);
    return () => import_electron.ipcRenderer.removeListener("msg:updated", cb);
  },
  onProjectChanged: (cb) => {
    import_electron.ipcRenderer.on("data:project:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:project:changed", cb);
  },
  onTaskChanged: (cb) => {
    import_electron.ipcRenderer.on("data:task:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:task:changed", cb);
  },
  onMemberChanged: (cb) => {
    import_electron.ipcRenderer.on("data:member:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:member:changed", cb);
  },
  onAttendanceChanged: (cb) => {
    import_electron.ipcRenderer.on("data:attendance:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:attendance:changed", cb);
  },
  onProjectRichChanged: (cb) => {
    import_electron.ipcRenderer.on("data:projectrich:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:projectrich:changed", cb);
  },
  onRolePermsChanged: (cb) => {
    import_electron.ipcRenderer.on("data:roleperms:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:roleperms:changed", cb);
  },
  onRoleChanged: (cb) => {
    import_electron.ipcRenderer.on("data:role:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:role:changed", cb);
  },
  onOrgChanged: (cb) => {
    import_electron.ipcRenderer.on("data:org:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:org:changed", cb);
  },
  onNotifPrefChanged: (cb) => {
    import_electron.ipcRenderer.on("data:notifpref:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:notifpref:changed", cb);
  },
  onAppearancePrefChanged: (cb) => {
    import_electron.ipcRenderer.on("data:appearancepref:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:appearancepref:changed", cb);
  },
  onConvMetaChanged: (cb) => {
    import_electron.ipcRenderer.on("data:convmeta:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:convmeta:changed", cb);
  },
  onDeptChanged: (cb) => {
    import_electron.ipcRenderer.on("data:dept:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:dept:changed", cb);
  },
  onAuthUserChanged: (cb) => {
    import_electron.ipcRenderer.on("data:authuser:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:authuser:changed", cb);
  },
  // Fix 9: notification change stream — syncs read-state and new notifications across devices
  onNotificationChanged: (cb) => {
    import_electron.ipcRenderer.on("data:notification:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:notification:changed", cb);
  },
  onCommentChanged: (cb) => {
    import_electron.ipcRenderer.on("data:comment:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:comment:changed", cb);
  },
  onAttachmentChanged: (cb) => {
    import_electron.ipcRenderer.on("data:attachment:changed", cb);
    return () => import_electron.ipcRenderer.removeListener("data:attachment:changed", cb);
  },
  // Update event listeners
  onUpdateChecking: (cb) => {
    import_electron.ipcRenderer.on("update:checking", cb);
    return () => import_electron.ipcRenderer.removeListener("update:checking", cb);
  },
  onUpdateAvailable: (cb) => {
    import_electron.ipcRenderer.on("update:available", cb);
    return () => import_electron.ipcRenderer.removeListener("update:available", cb);
  },
  onUpdateNotAvailable: (cb) => {
    import_electron.ipcRenderer.on("update:not-available", cb);
    return () => import_electron.ipcRenderer.removeListener("update:not-available", cb);
  },
  onDownloadProgress: (cb) => {
    import_electron.ipcRenderer.on("update:download-progress", cb);
    return () => import_electron.ipcRenderer.removeListener("update:download-progress", cb);
  },
  onUpdateDownloaded: (cb) => {
    import_electron.ipcRenderer.on("update:downloaded", cb);
    return () => import_electron.ipcRenderer.removeListener("update:downloaded", cb);
  },
  onUpdateError: (cb) => {
    import_electron.ipcRenderer.on("update:error", cb);
    return () => import_electron.ipcRenderer.removeListener("update:error", cb);
  },
  // User preferences (theme, sidebar, week start, walkthrough, view)
  userPrefs: {
    get: (userId) => import_electron.ipcRenderer.invoke("db:userpref:get", userId),
    set: (prefs) => import_electron.ipcRenderer.invoke("db:userpref:set", prefs)
  },
  // Notification preferences
  notifPrefs: {
    get: (userId) => import_electron.ipcRenderer.invoke("db:notifpref:get", userId),
    set: (prefs) => import_electron.ipcRenderer.invoke("db:notifpref:set", prefs)
  },
  // Notifications
  notifs: {
    getAll: (userId) => import_electron.ipcRenderer.invoke("db:notifs:getAll", userId),
    create: (notif) => import_electron.ipcRenderer.invoke("db:notifs:create", notif),
    markRead: (notifId) => import_electron.ipcRenderer.invoke("db:notifs:markRead", notifId),
    markAllRead: (userId) => import_electron.ipcRenderer.invoke("db:notifs:markAllRead", userId),
    deleteOld: (userId) => import_electron.ipcRenderer.invoke("db:notifs:deleteOld", userId)
  },
  // Appearance preferences
  appearancePrefs: {
    get: (userId) => import_electron.ipcRenderer.invoke("db:appearancepref:get", userId),
    set: (prefs) => import_electron.ipcRenderer.invoke("db:appearancepref:set", prefs)
  },
  // Auth — credentials stored in MongoDB Atlas
  auth: {
    login: (email, password) => import_electron.ipcRenderer.invoke("db:auth:login", email, password),
    register: (name, email, password, role, orgId) => import_electron.ipcRenderer.invoke("db:auth:register", name, email, password, role, orgId),
    updatePassword: (userId, currentPassword, newPassword) => import_electron.ipcRenderer.invoke("db:auth:updatePassword", userId, currentPassword, newPassword),
    updateName: (userId, newName) => import_electron.ipcRenderer.invoke("db:auth:updateName", userId, newName),
    seedDefault: () => import_electron.ipcRenderer.invoke("db:auth:seedDefault"),
    validate: (userId) => import_electron.ipcRenderer.invoke("db:auth:validate", userId),
    getAll: () => import_electron.ipcRenderer.invoke("db:auth:getAll"),
    updateRole: (userId, role) => import_electron.ipcRenderer.invoke("db:auth:updateRole", userId, role)
  },
  // Database — all operations go through Electron main → MongoDB Atlas
  db: {
    // Projects
    getProjects: () => import_electron.ipcRenderer.invoke("db:projects:getAll"),
    createProject: (name, color) => import_electron.ipcRenderer.invoke("db:projects:create", name, color),
    updateProject: (id, changes) => import_electron.ipcRenderer.invoke("db:projects:update", id, changes),
    deleteProject: (id) => import_electron.ipcRenderer.invoke("db:projects:delete", id),
    // Tasks
    getTasks: () => import_electron.ipcRenderer.invoke("db:tasks:getAll"),
    createTask: (task) => import_electron.ipcRenderer.invoke("db:tasks:create", task),
    updateTask: (id, changes) => import_electron.ipcRenderer.invoke("db:tasks:update", id, changes),
    deleteTask: (id) => import_electron.ipcRenderer.invoke("db:tasks:delete", id),
    moveTask: (id, newStatus, actorId, actorName) => import_electron.ipcRenderer.invoke("db:tasks:move", id, newStatus, actorId, actorName),
    scrubAssignee: (memberId) => import_electron.ipcRenderer.invoke("db:tasks:scrubAssignee", memberId),
    // Members
    getMembers: () => import_electron.ipcRenderer.invoke("db:members:getAll"),
    addMember: (member) => import_electron.ipcRenderer.invoke("db:members:add", member),
    updateMember: (id, changes) => import_electron.ipcRenderer.invoke("db:members:update", id, changes),
    updateMemberRole: (id, role) => import_electron.ipcRenderer.invoke("db:members:updateRole", id, role),
    removeMember: (id) => import_electron.ipcRenderer.invoke("db:members:remove", id),
    // Attendance
    getAttendance: () => import_electron.ipcRenderer.invoke("db:attendance:getAll"),
    setAttendance: (record) => import_electron.ipcRenderer.invoke("db:attendance:set", record),
    deleteAttendance: (userId, date) => import_electron.ipcRenderer.invoke("db:attendance:delete", userId, date),
    // Messages
    getMessagesBetween: (userId, peerId) => import_electron.ipcRenderer.invoke("db:messages:getBetween", userId, peerId),
    sendMessage: (msg) => import_electron.ipcRenderer.invoke("db:messages:send", msg),
    reactToMessage: (msgId, userId, emoji) => import_electron.ipcRenderer.invoke("db:messages:react", msgId, userId, emoji),
    deleteMessage: (msgId) => import_electron.ipcRenderer.invoke("db:messages:delete", msgId),
    editMessage: (msgId, newText) => import_electron.ipcRenderer.invoke("msg:edit", msgId, newText),
    markMessagesRead: (userId, peerId) => import_electron.ipcRenderer.invoke("db:messages:markRead", userId, peerId),
    getUnreadCounts: (userId) => import_electron.ipcRenderer.invoke("db:messages:unread-counts", userId),
    // Conv meta
    getConvMeta: (userId) => import_electron.ipcRenderer.invoke("db:convmeta:getAll", userId),
    setConvMeta: (meta) => import_electron.ipcRenderer.invoke("db:convmeta:set", meta),
    // Departments
    getDepts: () => import_electron.ipcRenderer.invoke("db:depts:getAll"),
    createDept: (dept) => import_electron.ipcRenderer.invoke("db:depts:create", dept),
    updateDept: (id, changes) => import_electron.ipcRenderer.invoke("db:depts:update", id, changes),
    deleteDept: (id) => import_electron.ipcRenderer.invoke("db:depts:delete", id),
    // Project rich data
    getProjectRich: () => import_electron.ipcRenderer.invoke("db:projectrich:getAll"),
    setProjectRich: (data) => import_electron.ipcRenderer.invoke("db:projectrich:set", data),
    deleteProjectRich: (projectId) => import_electron.ipcRenderer.invoke("db:projectrich:delete", projectId),
    // Organization
    getOrg: () => import_electron.ipcRenderer.invoke("db:org:get"),
    setOrg: (data) => import_electron.ipcRenderer.invoke("db:org:set", data),
    listOrgs: () => import_electron.ipcRenderer.invoke("db:org:list"),
    // Role permissions
    getRolePerms: () => import_electron.ipcRenderer.invoke("db:roleperms:getAll"),
    setRolePerms: (data) => import_electron.ipcRenderer.invoke("db:roleperms:set", data),
    // Roles (dynamic)
    getRoles: () => import_electron.ipcRenderer.invoke("db:roles:getAll"),
    createRole: (data) => import_electron.ipcRenderer.invoke("db:roles:create", data),
    updateRoleColor: (data) => import_electron.ipcRenderer.invoke("db:roles:updateColor", data),
    renameRole: (data) => import_electron.ipcRenderer.invoke("db:roles:rename", data),
    deleteRole: (data) => import_electron.ipcRenderer.invoke("db:roles:delete", data),
    deleteRolePerms: (data) => import_electron.ipcRenderer.invoke("db:roleperms:delete", data),
    // Presence
    heartbeat: (userId) => import_electron.ipcRenderer.invoke("db:presence:heartbeat", userId),
    // Comments
    getComments: (taskId) => import_electron.ipcRenderer.invoke("db:comments:getByTask", taskId),
    addComment: (data) => import_electron.ipcRenderer.invoke("db:comments:add", data),
    deleteComment: (commentId) => import_electron.ipcRenderer.invoke("db:comments:delete", commentId),
    // Attachments
    getAttachments: (taskId) => import_electron.ipcRenderer.invoke("db:attachments:getByTask", taskId),
    pickAttachments: (taskId) => import_electron.ipcRenderer.invoke("db:attachments:pick", taskId),
    pickForStaging: () => import_electron.ipcRenderer.invoke("db:attachments:pickForStaging"),
    saveAttachments: (taskId, filePaths) => import_electron.ipcRenderer.invoke("db:attachments:savePaths", taskId, filePaths),
    deleteAttachment: (attachId) => import_electron.ipcRenderer.invoke("db:attachments:delete", attachId),
    openAttachment: (filePath) => import_electron.ipcRenderer.invoke("db:attachments:open", filePath),
    // Task Templates
    getTemplates: () => import_electron.ipcRenderer.invoke("db:templates:getAll"),
    createTemplate: (data) => import_electron.ipcRenderer.invoke("db:templates:create", data),
    deleteTemplate: (id) => import_electron.ipcRenderer.invoke("db:templates:delete", id),
    // Avatar
    pickAvatar: () => import_electron.ipcRenderer.invoke("db:members:pickAvatar")
  },
  // PDF export
  printToPDF: () => import_electron.ipcRenderer.invoke("app:printToPDF")
});
