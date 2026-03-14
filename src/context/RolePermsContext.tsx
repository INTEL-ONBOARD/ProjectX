import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;

export interface RolePerms {
    role: string;
    allowedRoutes: string[];
}

const DEFAULT_PERMS: RolePerms[] = [
    { role: 'admin',   allowedRoutes: ['/', '/dashboard', '/messages', '/tasks', '/teams', '/members', '/attendance', '/reports', '/organization', '/settings', '/admin'] },
    { role: 'manager', allowedRoutes: ['/', '/dashboard', '/messages', '/tasks', '/teams', '/attendance', '/settings'] },
    { role: 'member',  allowedRoutes: ['/settings'] },
];

interface RolePermsContextType {
    perms: RolePerms[];
    getAllowedRoutes: (role: string) => string[];
    setRolePerms: (role: string, allowedRoutes: string[]) => Promise<void>;
}

export const RolePermsContext = createContext<RolePermsContextType>({
    perms: DEFAULT_PERMS,
    getAllowedRoutes: (role) => DEFAULT_PERMS.find(p => p.role === role)?.allowedRoutes ?? ['/settings'],
    setRolePerms: async () => {},
});

export const useRolePerms = () => useContext(RolePermsContext);

export const RolePermsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [perms, setPerms] = useState<RolePerms[]>(DEFAULT_PERMS);

    useEffect(() => {
        dbApi().getRolePerms()
            .then((data: RolePerms[]) => { if (data && data.length > 0) setPerms(data); })
            .catch((err: unknown) => console.error('[RolePermsContext] Failed to load role perms:', err));
    }, []);

    const getAllowedRoutes = useCallback((role: string): string[] => {
        return perms.find(p => p.role === role)?.allowedRoutes ?? ['/settings'];
    }, [perms]);

    const setRolePerms = useCallback(async (role: string, allowedRoutes: string[]) => {
        const updated = await dbApi().setRolePerms({ role, allowedRoutes });
        setPerms(prev => prev.map(p => p.role === role ? updated : p));
    }, []);

    return (
        <RolePermsContext.Provider value={{ perms, getAllowedRoutes, setRolePerms }}>
            {children}
        </RolePermsContext.Provider>
    );
};
