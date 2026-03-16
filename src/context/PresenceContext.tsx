import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';

const HEARTBEAT_MS = 5000;
const dbApi = () => (window as any).electronAPI.db;

export function getPresenceStatus(lastSeen?: string | null): 'online' | 'away' | 'offline' {
    if (!lastSeen) return 'offline';
    const diffMs = Date.now() - new Date(lastSeen).getTime();
    if (diffMs < 8_000) return 'online';
    if (diffMs < 20_000) return 'away';
    return 'offline';
}

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: authUser } = useAuth();

    // Only send heartbeats — member lastSeen updates are delivered via MembersContext
    // change stream (UserModel.watch), so polling refetchMembers is no longer needed.
    useEffect(() => {
        if (!authUser) return;

        dbApi().heartbeat(authUser.id).catch(console.error);

        const heartbeatId = setInterval(() => {
            dbApi().heartbeat(authUser.id).catch(console.error);
        }, HEARTBEAT_MS);

        return () => { clearInterval(heartbeatId); };
    }, [authUser?.id]);

    return <>{children}</>;
};
