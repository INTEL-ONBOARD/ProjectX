export type Priority = 'low' | 'high' | 'completed';
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
    dueDate?: string;
    projectId?: string;
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
