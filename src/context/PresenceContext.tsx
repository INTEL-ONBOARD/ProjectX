import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useMembersContext } from './MembersContext';

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

interface PresenceContextValue {
    getStatus: (userId: string) => 'online' | 'away' | 'offline';
}

const PresenceContext = createContext<PresenceContextValue>({ getStatus: () => 'offline' });

export const usePresence = () => useContext(PresenceContext);

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: authUser } = useAuth();
    const { members } = useMembersContext();
    // lastSeenMap: userId → ISO string, updated from members array + live stream events
    const [lastSeenMap, setLastSeenMap] = useState<Record<string, string | null>>({});
    const [, setTick] = useState(0);
    const mapRef = useRef(lastSeenMap);
    mapRef.current = lastSeenMap;

    // Sync lastSeen from the members array whenever it changes (covers initial load + refetch)
    useEffect(() => {
        if (members.length === 0) return;
        setLastSeenMap(prev => {
            const next = { ...prev };
            let changed = false;
            for (const m of members) {
                const ls = (m as any).lastSeen ?? null;
                if (next[m.id] !== ls) { next[m.id] = ls; changed = true; }
            }
            return changed ? next : prev;
        });
    }, [members]);

    // Also listen to the member change stream directly for sub-2s lastSeen updates
    // (the members array in MembersContext only updates for non-lastSeen changes now)
    useEffect(() => {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.onMemberChanged) return;
        const unsub = electronAPI.onMemberChanged((_: unknown, payload: { op: string; doc?: any }) => {
            const { op, doc } = payload;
            if ((op === 'update' || op === 'replace' || op === 'insert') && doc?.id) {
                const ls = doc.lastSeen ?? null;
                setLastSeenMap(prev => {
                    if (prev[doc.id] === ls) return prev;
                    return { ...prev, [doc.id]: ls };
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

    // Tick every 2 s so time-deltas stay fresh
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 2_000);
        return () => clearInterval(id);
    }, []);

    const getStatus = (userId: string): 'online' | 'away' | 'offline' =>
        getPresenceStatus(mapRef.current[userId]);

    return (
        <PresenceContext.Provider value={{ getStatus }}>
            {children}
        </PresenceContext.Provider>
    );
};
