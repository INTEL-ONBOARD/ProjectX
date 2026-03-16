export type Priority = 'low' | 'medium' | 'high' | 'completed';
export type TaskStatus = 'todo' | 'in-progress' | 'ready-for-qa' | 'deployment-pending' | 'blocker' | 'done';

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

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: Priority;
    status: TaskStatus;
    assignees: string[];
    comments: number;
    commentData?: TaskCommentItem[];
    files: number;
    images?: string[];
    startDate?: string;
    dueDate?: string;
    projectId?: string;
    activity?: TaskActivityEntry[];
}

export interface Project {
    id: string;
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
