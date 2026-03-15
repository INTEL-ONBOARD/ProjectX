import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useProjects } from './ProjectContext';
import { useMembersContext } from './MembersContext';

export interface AppNotification {
    id: string;
    userId: string;
    type: 'task_overdue' | 'task_assigned' | 'new_message';
    title: string;
    body: string;
    refId: string;
    read: boolean;
    createdAt: string;
}

interface NotificationContextValue {
    notifications: AppNotification[];
    unreadCount: number;
    markAllRead: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const notifsApi = () => (window as any).electronAPI.notifs as {
    getAll:      (userId: string) => Promise<AppNotification[]>;
    create:      (notif: object)  => Promise<AppNotification>;
    markRead:    (notifId: string) => Promise<boolean>;
    markAllRead: (userId: string)  => Promise<boolean>;
    deleteOld:   (userId: string)  => Promise<boolean>;
};

export const NotificationContext = createContext<NotificationContextValue>({
    notifications: [],
    unreadCount: 0,
    markAllRead: async () => {},
    markRead: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { allTasks } = useProjects();
    const { members } = useMembersContext();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const seenRefIds = useRef<Set<string>>(new Set());

    // Load persisted notifications for current user on login
    const loadNotifs = useCallback(async () => {
        if (!user) return;
        try {
            const all = await notifsApi().getAll(user.id);
            setNotifications(all);
            seenRefIds.current = new Set(all.map(n => n.refId).filter(Boolean));
            await notifsApi().deleteOld(user.id);
        } catch { /* ignore */ }
    }, [user?.id]);

    useEffect(() => {
        loadNotifs();
    }, [loadNotifs]);

    // Generate task_overdue and task_assigned notifications from allTasks
    useEffect(() => {
        if (!user || allTasks.length === 0) return;
        const todayStr = new Date().toISOString().slice(0, 10);

        const generate = async () => {
            for (const task of allTasks) {
                if (!task.assignees.includes(user.id)) continue;

                // task_overdue: assigned to me, past due, not done
                if (
                    task.dueDate && task.dueDate < todayStr &&
                    task.status !== 'done' &&
                    !seenRefIds.current.has(`overdue-${task.id}`)
                ) {
                    seenRefIds.current.add(`overdue-${task.id}`);
                    try {
                        const n = await notifsApi().create({
                            userId: user.id,
                            type: 'task_overdue',
                            title: task.title,
                            body: `Due ${task.dueDate}`,
                            refId: `overdue-${task.id}`,
                        });
                        setNotifications(prev => [n, ...prev]);
                    } catch { /* ignore */ }
                }

                // task_assigned: I am in assignees
                if (!seenRefIds.current.has(`assigned-${task.id}`)) {
                    seenRefIds.current.add(`assigned-${task.id}`);
                    try {
                        const n = await notifsApi().create({
                            userId: user.id,
                            type: 'task_assigned',
                            title: task.title,
                            body: 'You were assigned to this task',
                            refId: `assigned-${task.id}`,
                        });
                        setNotifications(prev => [n, ...prev]);
                    } catch { /* ignore */ }
                }
            }
        };
        generate();
    }, [allTasks, user?.id]);

    // Poll for new_message notifications every 30s
    useEffect(() => {
        if (!user || members.length === 0) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbApi = () => (window as any).electronAPI.db;

        const checkMessages = async () => {
            for (const member of members) {
                if (member.id === user.id) continue;
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const msgs: any[] = await dbApi().getMessagesBetween(user.id, member.id);
                    for (const msg of msgs) {
                        if (
                            msg.from !== user.id &&
                            msg.read === false &&
                            !seenRefIds.current.has(`msg-${msg.id}`)
                        ) {
                            seenRefIds.current.add(`msg-${msg.id}`);
                            try {
                                const n = await notifsApi().create({
                                    userId: user.id,
                                    type: 'new_message',
                                    title: `Message from ${member.name}`,
                                    body: String(msg.text ?? '').slice(0, 60),
                                    refId: `msg-${msg.id}`,
                                });
                                setNotifications(prev => [n, ...prev]);
                            } catch { /* ignore */ }
                        }
                    }
                } catch { /* ignore */ }
            }
        };

        checkMessages();
        const interval = setInterval(checkMessages, 30_000);
        return () => clearInterval(interval);
    }, [user?.id, members]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllRead = useCallback(async () => {
        if (!user) return;
        await notifsApi().markAllRead(user.id);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, [user?.id]);

    const markRead = useCallback(async (id: string) => {
        await notifsApi().markRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead }}>
            {children}
        </NotificationContext.Provider>
    );
};
