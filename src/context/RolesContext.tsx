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

    useEffect(() => {
        let cancelled = false;
        let focusTimer: ReturnType<typeof setTimeout> | null = null;
        loadRoles();

        const onFocus = () => {
            if (focusTimer) clearTimeout(focusTimer);
            focusTimer = setTimeout(() => {
                dbApi().getRoles().then((docs: RoleDoc[]) => { if (!cancelled) setRoles(docs); }).catch(() => {});
            }, 300);
        };
        window.addEventListener('focus', onFocus);

        return () => {
            cancelled = true;
            if (focusTimer) clearTimeout(focusTimer);
            window.removeEventListener('focus', onFocus);
        };
    }, [loadRoles]);

    // Real-time sync for roles
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) return;
        let cancelled = false;
        const unsub = electronAPI.onRoleChanged?.((_: unknown, payload: { op: string; doc?: RoleDoc; id?: string }) => {
            if (cancelled) return;
            const { op, doc, id } = payload;
            if (op === 'insert') {
                setRoles(prev => prev.some(r => r.appId === doc!.appId) ? prev : [...prev, doc!]);
            } else if (op === 'update' || op === 'replace') {
                setRoles(prev => {
                    const exists = prev.some(r => r.appId === doc!.appId);
                    return exists ? prev.map(r => r.appId === doc!.appId ? doc! : r) : [...prev, doc!];
                });
            } else if (op === 'delete') {
                if (id) {
                    setRoles(prev => prev.filter(r => r.appId !== id));
                } else {
                    dbApi().getRoles().then((docs: RoleDoc[]) => { if (!cancelled) setRoles(docs); }).catch(() => {});
                }
            }
        });
        // Fix 7: refetch after DB reconnect
        const unsubReconnect = electronAPI.onDbReconnected?.(() => {
            dbApi().getRoles().then((docs: RoleDoc[]) => { if (!cancelled) setRoles(docs); }).catch(() => {});
        });
        return () => { cancelled = true; unsub?.(); unsubReconnect?.(); };
    }, []);

    const addRole = useCallback((role: RoleDoc) => {
        setRoles(prev => prev.some(r => r.appId === role.appId) ? prev : [...prev, role]);
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
