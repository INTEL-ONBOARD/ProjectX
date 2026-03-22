export type Priority = 'low' | 'medium' | 'high' | 'completed';
export type TaskStatus = 'todo' | 'in-progress' | 'ready-for-qa' | 'deployment-pending' | 'blocker' | 'on-hold' | 'done';

export interface User {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    location?: string;
    role: string;
    designation?: string;
    status?: 'active' | 'inactive';
    phone?: string;
    department?: string;
    bio?: string;
    joinedAt?: string;
    lastSeen?: string | null;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TimeEntry {
  id: string;
  userId: string;
  startedAt: string; // ISO string
  endedAt?: string;  // ISO string, undefined = active
  note?: string;
}

export interface TaskComment {
    id: string;
    userId: string;
    content: string;
    createdAt: string;
}

export interface TaskCommentItem {
    id: string;
    author: string;
    text: string;
    time: string;
}

export type TaskActivityEntryType =
    | 'created'
    | 'status_changed'
    | 'priority_changed'
    | 'assignee_added'
    | 'assignee_removed'
    | 'due_date_changed'
    | 'title_changed'
    | 'description_changed';

export interface TaskActivityEntry {
    id: string;
    type: TaskActivityEntryType;
    actorId: string;
    actorName: string;
    timestamp: string;
    from?: string;
    to?: string;
}

export type TaskType = 'task' | 'issue';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
    id: string;
    appId?: string;
    title: string;
    description: string;
    priority: Priority;
    status: TaskStatus;
    taskType?: TaskType;
    taskNumber?: number | null;
    blockedBy?: string[];
    recurrence?: Recurrence;
    order?: number;
    assignees: string[];
    comments: number;
    commentData?: TaskCommentItem[];
    files: number;
    images?: string[];
    startDate?: string;
    dueDate?: string;
    projectId?: string;
    activity?: TaskActivityEntry[];
    subtasks?: Subtask[];
    estimatedMinutes?: number;
    timeEntries?: TimeEntry[];
    completedAt?: string;   // ISO date string — stamped when status first set to 'done'
}

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    authorName: string;
    text: string;
    createdAt: string;
}

export interface Attachment {
    id: string;
    taskId: string;
    name: string;
    filePath: string;
    size: number;
    uploadedAt: string;
}

export interface TaskTemplate {
    id: string;
    name: string;
    priority: 'low' | 'medium' | 'high';
    taskType: TaskType;
    description: string;
    assignees: string[];
    projectId: string;
}

export interface Project {
    id: string;
    appId?: string;
    name: string;
    color: string;
    tasks: Task[];
}

export interface Column {
    id: TaskStatus;
    title: string;
    color: string;
    dotColor: string;
    tasks: Task[];
}

export interface NavItem {
    id: string;
    label: string;
    icon: string;
    badge?: number;
}

export interface Milestone {
    id: string;
    name: string;
    dueDate: string;
    completed: boolean;
}
