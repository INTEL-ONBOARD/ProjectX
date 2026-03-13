/// <reference types="vite/client" />

import type { Project, Task, TaskStatus, User, AttendanceRecord } from './types';

interface ElectronDB {
  getProjects(): Promise<Project[]>;
  createProject(name: string, color: string): Promise<Project>;
  updateProject(id: string, changes: Partial<Pick<Project, 'name' | 'color'>>): Promise<Project | null>;
  deleteProject(id: string): Promise<boolean>;

  getTasks(): Promise<Task[]>;
  createTask(task: Omit<Task, 'id'>): Promise<Task>;
  updateTask(id: string, changes: Partial<Omit<Task, 'id'>>): Promise<Task | null>;
  deleteTask(id: string): Promise<boolean>;
  moveTask(id: string, newStatus: TaskStatus): Promise<Task | null>;
  scrubAssignee(memberId: string): Promise<boolean>;

  getMembers(): Promise<User[]>;
  addMember(member: Omit<User, 'id'>): Promise<User>;
  removeMember(id: string): Promise<boolean>;

  getAttendance(): Promise<AttendanceRecord[]>;
  setAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord>;
  deleteAttendance(userId: string, date: string): Promise<boolean>;
}

interface ElectronAPI {
  platform: string;
  getVersion(): Promise<string>;
  checkForUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
  onUpdateChecking(cb: () => void): () => void;
  onUpdateAvailable(cb: (_: unknown, info: { version: string; releaseDate?: string; releaseNotes?: string | null }) => void): () => void;
  onUpdateNotAvailable(cb: () => void): () => void;
  onDownloadProgress(cb: (_: unknown, progress: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void): () => void;
  onUpdateDownloaded(cb: (_: unknown, info: { version: string }) => void): () => void;
  onUpdateError(cb: (_: unknown, message: string) => void): () => void;
  db: ElectronDB;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
