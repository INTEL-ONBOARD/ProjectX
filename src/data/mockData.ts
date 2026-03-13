import { Task, User, Project } from '../types';

export const currentUser: User = {
    id: 'u1',
    name: 'Anima Agrawal',
    avatar: '',
    email: 'anima@techcorp.com',
    location: 'U.P, India',
    role: 'admin',
    designation: 'Project Manager',
    status: 'active',
};

export const teamMembers: User[] = [
    { id: 'u1', name: 'Anima Agrawal', avatar: '', email: 'anima@techcorp.com', role: 'admin', location: 'U.P, India', designation: 'Project Manager', status: 'active' },
    { id: 'u2', name: 'Rohan Kumar', avatar: '', email: 'rohan@techcorp.com', role: 'manager', designation: 'Frontend Developer', status: 'active' },
    { id: 'u3', name: 'Priya Singh', avatar: '', email: 'priya@techcorp.com', role: 'member', designation: 'UI Designer', status: 'active' },
    { id: 'u4', name: 'Arjun Patel', avatar: '', email: 'arjun@techcorp.com', role: 'member', designation: 'Backend Developer', status: 'active' },
    { id: 'u5', name: 'Neha Sharma', avatar: '', email: 'neha@techcorp.com', role: 'member', designation: 'QA Engineer', status: 'active' },
    { id: 'u6', name: 'Vikram Rao', avatar: '', email: 'vikram@techcorp.com', role: 'member', designation: 'DevOps Engineer', status: 'active' },
];

export const memberColors = [
    '#5030E5', '#E5A030', '#30C5E5', '#E53070', '#30E57A', '#E5D030',
];

export const MOCK_TODAY = '2020-12-15';

export const PROJECT_COLORS = [
  '#7AC555', '#FFA500', '#E4CCFD', '#76A5EA', '#5030E5', '#30C5E5',
];

export const projects: Project[] = [
    {
        id: 'p1',
        name: 'Mobile App',
        color: '#7AC555',
        tasks: [],
    },
    {
        id: 'p2',
        name: 'Website Redesign',
        color: '#FFA500',
        tasks: [],
    },
    {
        id: 'p3',
        name: 'Design System',
        color: '#E4CCFD',
        tasks: [],
    },
    {
        id: 'p4',
        name: 'Wireframes',
        color: '#76A5EA',
        tasks: [],
    },
];

export const todoTasks: Task[] = [
    {
        id: 't1',
        title: 'Brainstorming',
        description: 'Brainstorming brings team members\' diverse experience into play.',
        priority: 'low',
        status: 'todo',
        assignees: ['u1', 'u2', 'u3'],
        comments: 12,
        files: 0,
        dueDate: '2020-12-22',
        projectId: 'p2',
    },
    {
        id: 't2',
        title: 'Research',
        description: 'User research helps you to create an optimal product for users.',
        priority: 'high',
        status: 'todo',
        assignees: ['u1', 'u4'],
        comments: 10,
        files: 3,
        dueDate: '2020-12-15',
        projectId: 'p4',
    },
    {
        id: 't3',
        title: 'Wireframes',
        description: 'Low fidelity wireframes include the most basic content and visuals.',
        priority: 'high',
        status: 'todo',
        assignees: ['u2', 'u3', 'u5'],
        comments: 7,
        files: 2,
        dueDate: '2020-12-28',
        projectId: 'p4',
    },
];

export const inProgressTasks: Task[] = [
    {
        id: 't4',
        title: 'Onboarding Illustrations',
        description: '',
        priority: 'low',
        status: 'in-progress',
        assignees: ['u1', 'u3', 'u4'],
        comments: 14,
        files: 15,
        dueDate: '2020-12-18',
        projectId: 'p1',
        images: [
            'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=200&h=120&fit=crop',
            'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=200&h=120&fit=crop',
        ],
    },
    {
        id: 't5',
        title: 'Moodboard',
        description: '',
        priority: 'low',
        status: 'in-progress',
        assignees: ['u5'],
        comments: 9,
        files: 10,
        dueDate: '2020-12-20',
        projectId: 'p3',
        images: [
            'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=200&h=120&fit=crop',
            'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=200&h=120&fit=crop',
        ],
    },
];

export const doneTasks: Task[] = [
    {
        id: 't6',
        title: 'Mobile App Design',
        description: '',
        priority: 'completed',
        status: 'done',
        assignees: ['u1', 'u2'],
        comments: 12,
        files: 15,
        projectId: 'p1',
        images: [
            'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=200&h=120&fit=crop',
            'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=200&h=120&fit=crop',
        ],
    },
    {
        id: 't7',
        title: 'Design System',
        description: 'It just needs to adapt the UI from what you did before',
        priority: 'completed',
        status: 'done',
        assignees: ['u1', 'u3', 'u4'],
        comments: 12,
        files: 15,
        projectId: 'p3',
    },
];
