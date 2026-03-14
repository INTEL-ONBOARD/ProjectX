import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;

export interface RoleDoc {
    appId: string;
    name: string;
    color: string;
}

interface RolesContextType {
    roles: RoleDoc[];
    loadRoles: () => Promise<void>;
    addRole: (role: RoleDoc) => void;
    updateRoleLocal: (appId: string, changes: Partial<RoleDoc>) => void;
    renameRoleLocal: (appId: string, newName: string) => void;
    removeRole: (appId: string) => void;
}

const RolesContext = createContext<RolesContextType>({
    roles: [],
    loadRoles: async () => {},
    addRole: () => {},
    updateRoleLocal: () => {},
    renameRoleLocal: () => {},
    removeRole: () => {},
});

export const useRoles = () => useContext(RolesContext);

export const RolesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [roles, setRoles] = useState<RoleDoc[]>([]);

    const loadRoles = useCallback(async () => {
        try {
            const docs = await dbApi().getRoles() as RoleDoc[];
            setRoles(docs);
        } catch (err) {
            console.error('[RolesContext] Failed to load roles:', err);
        }
    }, []);

    useEffect(() => { loadRoles(); }, [loadRoles]);

    const addRole = useCallback((role: RoleDoc) => {
        setRoles(prev => [...prev, role]);
    }, []);

    const updateRoleLocal = useCallback((appId: string, changes: Partial<RoleDoc>) => {
        setRoles(prev => prev.map(r => r.appId === appId ? { ...r, ...changes } : r));
    }, []);

    const renameRoleLocal = useCallback((appId: string, newName: string) => {
        setRoles(prev => prev.map(r => r.appId === appId ? { ...r, name: newName } : r));
    }, []);

    const removeRole = useCallback((appId: string) => {
        setRoles(prev => prev.filter(r => r.appId !== appId));
    }, []);

    return (
        <RolesContext.Provider value={{ roles, loadRoles, addRole, updateRoleLocal, renameRoleLocal, removeRole }}>
            {children}
        </RolesContext.Provider>
    );
};
