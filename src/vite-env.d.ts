/// <reference types="vite/client" />

import type { Project, Task, TaskStatus, User } from './types';
import type { Organization, AttendanceRecord } from './context/AppContext';
import type { RolePerms } from './context/RolePermsContext';

interface ElectronDB {
  // Projects
  getProjects(): Promise<Project[]>;
  createProject(name: string, color: string): Promise<Project>;
  updateProject(id: string, changes: Partial<Pick<Project, 'name' | 'color'>>): Promise<Project | null>;
  deleteProject(id: string): Promise<boolean>;

  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: Omit<Task, 'id'>): Promise<Task>;
  updateTask(id: string, changes: Partial<Omit<Task, 'id'>>): Promise<Task | null>;
  deleteTask(id: string): Promise<boolean>;
  moveTask(id: string, newStatus: TaskStatus): Promise<Task | null>;
  scrubAssignee(memberId: string): Promise<boolean>;

  // Members
  getMembers(): Promise<User[]>;
  addMember(member: Omit<User, 'id'>): Promise<User>;
  updateMember(id: string, changes: Partial<Omit<User, 'id'>>): Promise<User | null>;
  removeMember(id: string): Promise<boolean>;

  // Attendance
  getAttendance(): Promise<AttendanceRecord[]>;
  setAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord>;
  deleteAttendance(userId: string, date: string): Promise<boolean>;

  // Messages
  getMessagesBetween(userId: string, peerId: string): Promise<unknown[]>;
  sendMessage(msg: object): Promise<unknown>;
  reactToMessage(msgId: string, userId: string, emoji: string): Promise<unknown>;
  deleteMessage(msgId: string): Promise<boolean>;

  // Conv meta
  getConvMeta(userId: string): Promise<unknown[]>;
  setConvMeta(meta: object): Promise<unknown>;

  // Departments
  getDepts(): Promise<unknown[]>;
  createDept(dept: object): Promise<unknown>;
  updateDept(id: string, changes: object): Promise<unknown>;
  deleteDept(id: string): Promise<boolean>;

  // Project rich data
  getProjectRich(): Promise<unknown[]>;
  setProjectRich(data: object): Promise<unknown>;
  deleteProjectRich(projectId: string): Promise<boolean>;

  // Organization
  getOrg(): Promise<Organization | null>;
  setOrg(data: object): Promise<Organization>;

  // Role permissions
  getRolePerms(): Promise<RolePerms[]>;
  setRolePerms(data: { role: string; allowedRoutes: string[] }): Promise<RolePerms>;
}

interface ElectronAuth {
  login(email: string, password: string): Promise<{ id: string; name: string; email: string; role: string }>;
  register(name: string, email: string, password: string, role: string): Promise<{ id: string; name: string; email: string; role: string }>;
  updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  updateName(userId: string, newName: string): Promise<void>;
  seedDefault(): Promise<void>;
  getAll(): Promise<{ id: string; name: string; email: string; role: string }[]>;
  updateRole(userId: string, role: string): Promise<void>;
}

interface ElectronUserPrefs {
  get(userId: string): Promise<{ theme?: string; sidebarCollapsed?: boolean; selectedWeekStart?: string | null; hasSeenWalkthrough?: boolean; projectsView?: string } | null>;
  set(prefs: object): Promise<unknown>;
}

interface ElectronNotifPrefs {
  get(userId: string): Promise<object | null>;
  set(prefs: object): Promise<unknown>;
}

interface ElectronAppearancePrefs {
  get(userId: string): Promise<object | null>;
  set(prefs: object): Promise<unknown>;
}

interface ElectronAPI {
  platform: string;
  getVersion(): Promise<string>;
  checkForUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  onDbConnected(cb: () => void): () => void;
  onDbConnectionFailed(cb: (_: unknown, message: string) => void): () => void;
  onUpdateChecking(cb: () => void): () => void;
  onUpdateAvailable(cb: (_: unknown, info: { version: string; releaseDate?: string; releaseNotes?: string | null }) => void): () => void;
  onUpdateNotAvailable(cb: () => void): () => void;
  onDownloadProgress(cb: (_: unknown, progress: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void): () => void;
  onUpdateDownloaded(cb: (_: unknown, info: { version: string }) => void): () => void;
  onUpdateError(cb: (_: unknown, message: string) => void): () => void;
  db: ElectronDB;
  auth: ElectronAuth;
  userPrefs: ElectronUserPrefs;
  notifPrefs: ElectronNotifPrefs;
  appearancePrefs: ElectronAppearancePrefs;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
