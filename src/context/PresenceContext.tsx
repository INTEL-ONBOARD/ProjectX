import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useMembersContext } from './MembersContext';

const HEARTBEAT_MS = 520;
const POLL_MS = 520;
const dbApi = () => (window as any).electronAPI.db;

export function getPresenceStatus(lastSeen?: string | null): 'online' | 'away' | 'offline' {
    if (!lastSeen) return 'offline';
    const diffMs = Date.now() - new Date(lastSeen).getTime();
    if (diffMs < 3_000) return 'online';
    if (diffMs < 10_000) return 'away';
    return 'offline';
}

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: authUser } = useAuth();
    const { refetchMembers } = useMembersContext();

    useEffect(() => {
        if (!authUser) return;

        dbApi().heartbeat(authUser.id).catch(console.error);

        const heartbeatId = setInterval(() => {
            dbApi().heartbeat(authUser.id).catch(console.error);
        }, HEARTBEAT_MS);

        const pollId = setInterval(() => {
            refetchMembers().catch(console.error);
        }, POLL_MS);

        return () => {
            clearInterval(heartbeatId);
            clearInterval(pollId);
        };
    }, [authUser?.id]);

    return <>{children}</>;
};
