import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useProjects } from './ProjectContext';
import { useMembersContext } from './MembersContext';

export interface AppNotification {
    id: string;
    userId: string;
    type: 'task_overdue' | 'task_assigned' | 'new_message' | 'permission_request';
    title: string;
    body: string;
    refId: string;
    read: boolean;
    seenAt: string | null;
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
    // Fix 4: gate generate() behind a state variable so the useEffect dep array can track it
    const [notifsReady, setNotifsReady] = useState(false);

    // Load persisted notifications for current user on login
    const loadNotifs = useCallback(async () => {
        if (!user) return;
        setNotifsReady(false);
        try {
            const all = await notifsApi().getAll(user.id);
            setNotifications(all);
            const refIds = new Set(all.map(n => n.refId).filter(Boolean));
            // Also seed short-form catch-up guard keys so the catch-up effect
            // doesn't create a new DB notification on every launch while unread messages exist.
            refIds.forEach(refId => {
                // catch-up refIds are stored as "msg-catchup-<senderId>-<timestamp>"
                // seed the short-form key "msg-catchup-<senderId>" so the guard fires correctly
                if ((refId as string).startsWith('msg-catchup-')) {
                    const shortKey = (refId as string).replace(/-\d{13}$/, '');
                    refIds.add(shortKey);
                }
            });
            seenRefIds.current = refIds;
            await notifsApi().deleteOld(user.id);
        } catch { /* ignore */ }
        setNotifsReady(true);
    }, [user?.id]);

    useEffect(() => {
        loadNotifs();
    }, [loadNotifs]);

    // Generate task_overdue and task_assigned notifications from allTasks.
    // All creates are fired in parallel to avoid sequential IPC round-trips.
    useEffect(() => {
        if (!user || allTasks.length === 0 || !notifsReady) return;
        const todayStr = new Date().toISOString().slice(0, 10);

        const generate = async () => {
            const pending: Promise<void>[] = [];

            for (const task of allTasks) {
                if (!task.assignees.includes(user.id)) continue;

                // task_overdue: assigned to me, past due, not done
                if (
                    task.dueDate && task.dueDate < todayStr &&
                    task.status !== 'done' &&
                    !seenRefIds.current.has(`overdue-${task.id}`)
                ) {
                    seenRefIds.current.add(`overdue-${task.id}`);
                    pending.push(
                        notifsApi().create({
                            userId: user.id,
                            type: 'task_overdue',
                            title: task.title,
                            body: `Due ${task.dueDate}`,
                            refId: `overdue-${task.id}`,
                        }).then(n => {
                            setNotifications(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev]);
                        }).catch(() => { /* ignore */ })
                    );
                }

                // task_assigned: I am in assignees and task is not done
                if (task.status !== 'done' && !seenRefIds.current.has(`assigned-${task.id}`)) {
                    seenRefIds.current.add(`assigned-${task.id}`);
                    pending.push(
                        notifsApi().create({
                            userId: user.id,
                            type: 'task_assigned',
                            title: task.title,
                            body: 'You were assigned to this task',
                            refId: `assigned-${task.id}`,
                        }).then(n => {
                            setNotifications(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev]);
                        }).catch(() => { /* ignore */ })
                    );
                }
            }

            await Promise.all(pending);
        };
        generate();
    }, [allTasks, user?.id, notifsReady]);

    // Catch-up: create new_message notifications for unread messages received while app was closed
    useEffect(() => {
        if (!user || !notifsReady || members.length === 0) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;
        if (!api?.db?.getUnreadCounts) return;

        const catchUp = async () => {
            try {
                const counts: Record<string, number> = await api.db.getUnreadCounts(user.id);
                const pending: Promise<void>[] = [];
                for (const [senderId, count] of Object.entries(counts)) {
                    if (count === 0) continue;
                    const refId = `msg-catchup-${senderId}`;
                    if (seenRefIds.current.has(refId)) continue;
                    seenRefIds.current.add(refId);
                    const sender = members.find((m: { id: string }) => m.id === senderId);
                    const senderName = sender ? (sender as { name: string }).name : 'Someone';
                    // Use a session-unique refId so each app launch creates a fresh
                    // notification if there are still unread messages (not DB-deduped).
                    const sessionRefId = `${refId}-${Date.now()}`;
                    pending.push(
                        notifsApi().create({
                            userId: user.id,
                            type: 'new_message',
                            title: `Message from ${senderName}`,
                            body: `${count} unread message${count > 1 ? 's' : ''}`,
                            refId: sessionRefId,
                        }).then(n => {
                            setNotifications(prev => prev.some(x => x.id === n.id) ? prev : [n, ...prev]);
                        }).catch(() => { /* ignore */ })
                    );
                }
                await Promise.all(pending);
            } catch { /* ignore */ }
        };
        catchUp();
    }, [user?.id, notifsReady, members]);

    // Real-time new_message notifications via change stream
    useEffect(() => {
        if (!user || members.length === 0) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;
        if (!api?.onNewMessage) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsub = api.onNewMessage(async (_: unknown, msg: any) => {
            if (msg.from === user.id) return;   // own message
            if (msg.to !== user.id) return;     // not for me
            const refId = `msg-${msg.id}`;
            if (seenRefIds.current.has(refId)) return;
            seenRefIds.current.add(refId);
            const sender = members.find((m: { id: string }) => m.id === msg.from);
            const senderName = sender ? (sender as { name: string }).name : 'Someone';
            try {
                // Only persist to DB — the onNotificationChanged change stream will
                // pick it up and add it to state, avoiding double-add.
                await notifsApi().create({
                    userId: user.id,
                    type: 'new_message',
                    title: `Message from ${senderName}`,
                    body: String(msg.text ?? '').slice(0, 60),
                    refId,
                });
            } catch { /* ignore */ }
        });

        return () => unsub?.();
    }, [user?.id, members]);

    // Fix 9: sync notification read-state and new notifications from other devices
    useEffect(() => {
        if (!user) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;
        if (!api?.onNotificationChanged) return;

        const unsub = api.onNotificationChanged((_: unknown, payload: { op: string; doc?: AppNotification; id?: string }) => {
            const { op, doc, id } = payload;
            if (op === 'delete') {
                setNotifications(prev => prev.filter(n => n.id !== id));
                return;
            }
            if (!doc || doc.userId !== user.id) return; // only process events for current user
            if (op === 'insert') {
                // Another device created a notification — add if not already present
                setNotifications(prev => prev.some(n => n.id === doc.id) ? prev : [doc, ...prev]);
            } else if (op === 'update' || op === 'replace') {
                // e.g. read-state changed on another device
                setNotifications(prev => prev.map(n => n.id === doc.id ? doc : n));
            }
        });

        return () => unsub?.();
    }, [user?.id]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllRead = useCallback(async () => {
        if (!user) return;
        await notifsApi().markAllRead(user.id);
        const now = new Date().toISOString();
        setNotifications(prev => prev.map(n => ({ ...n, read: true, seenAt: n.seenAt ?? now })));
    }, [user?.id]);

    const markRead = useCallback(async (id: string) => {
        await notifsApi().markRead(id);
        const now = new Date().toISOString();
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, seenAt: n.seenAt ?? now } : n));
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead }}>
            {children}
        </NotificationContext.Provider>
    );
};
