import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const HEARTBEAT_MS = 2000;
const ONLINE_MS    = 8_000;
const AWAY_MS      = 20_000;
const dbApi = () => (window as any).electronAPI.db;

export function getPresenceStatus(lastSeen?: string | null): 'online' | 'away' | 'offline' {
    if (!lastSeen) return 'offline';
    const diffMs = Date.now() - new Date(lastSeen).getTime();
    if (diffMs < ONLINE_MS) return 'online';
    if (diffMs < AWAY_MS)   return 'away';
    return 'offline';
}

// tick is exposed so consumers re-render every 2 s and time-deltas stay fresh
interface PresenceContextValue {
    lastSeenMap: Record<string, string | null>;
    tick: number;
}

const PresenceContext = createContext<PresenceContextValue>({ lastSeenMap: {}, tick: 0 });

export const usePresence = () => {
    const { lastSeenMap, tick: _tick } = useContext(PresenceContext);
    // getStatus reads fresh lastSeenMap on every render (tick forces re-render every 2 s)
    const getStatus = (userId: string): 'online' | 'away' | 'offline' =>
        getPresenceStatus(lastSeenMap[userId]);
    const getLastSeen = (userId: string): string | null => lastSeenMap[userId] ?? null;
    return { getStatus, getLastSeen };
};

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: authUser } = useAuth();
    const [lastSeenMap, setLastSeenMap] = useState<Record<string, string | null>>({});
    const [tick, setTick] = useState(0);
    const refreshRef = useRef<() => void>(() => {});

    const refresh = () => {
        dbApi().getMembers().then((docs: any[]) => {
            setLastSeenMap(prev => {
                const next = { ...prev };
                let changed = false;
                for (const d of docs) {
                    const ls = d.lastSeen ?? null;
                    if (next[d.id] !== ls) { next[d.id] = ls; changed = true; }
                }
                return changed ? next : prev;
            });
        }).catch(() => {});
    };
    refreshRef.current = refresh;

    // Poll every 3 s — guaranteed accurate regardless of change stream delivery
    useEffect(() => {
        refreshRef.current(); // seed immediately on mount
        const id = setInterval(() => refreshRef.current(), 3_000);
        return () => clearInterval(id);
    }, []);

    // Change stream listener for instant updates
    useEffect(() => {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.onMemberChanged) return;
        const unsub = electronAPI.onMemberChanged((_: unknown, payload: { op: string; doc?: any; id?: string }) => {
            const { op, doc, id } = payload;
            if ((op === 'update' || op === 'replace' || op === 'insert') && doc?.id) {
                const ls = doc.lastSeen ?? null;
                setLastSeenMap(prev => {
                    if (prev[doc.id] === ls) return prev;
                    return { ...prev, [doc.id]: ls };
                });
            } else if (op === 'delete' && id) {
                setLastSeenMap(prev => {
                    if (!(id in prev)) return prev;
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            }
        });
        return () => unsub?.();
    }, []);

    // Send heartbeat every 2 s
    useEffect(() => {
        if (!authUser) return;
        dbApi().heartbeat(authUser.id).catch(console.error);
        const id = setInterval(() => dbApi().heartbeat(authUser.id).catch(console.error), HEARTBEAT_MS);
        return () => clearInterval(id);
    }, [authUser?.id]);

    // Tick every 2 s — propagates to consumers so time-deltas are re-evaluated
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 2_000);
        return () => clearInterval(id);
    }, []);

    return (
        <PresenceContext.Provider value={{ lastSeenMap, tick }}>
            {children}
        </PresenceContext.Provider>
    );
};
