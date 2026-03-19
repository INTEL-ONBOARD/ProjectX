import React, { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = () => window as any;
const dbApi = () => win().electronAPI.db;
const prefsApi = () => win().electronAPI.userPrefs;

function currentWeekMonday(): string {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d.toISOString().slice(0, 10);
}

export interface Organization {
    id: string;
    name: string;
    logo?: string;
    address?: string;
    workStart: string;
    workEnd: string;
    createdAt: string;
}

export interface Department {
    id: string;
    orgId: string;
    name: string;
}

export interface Team {
    id: string;
    orgId: string;
    name: string;
    leadId: string;
    description?: string;
    createdAt: string;
}

export interface User {
    id: string;
    orgId?: string;
    deptId?: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    pin?: string;
    designation?: string;
    location?: string;
    status: 'active' | 'inactive';
}

export interface LeaveType {
    id: string;
    name: string;
    days: number;
}

export interface LeaveRequest {
    id: string;
    userId: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
}

export interface AttendanceRecord {
    id: string;
    userId: string;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status: 'present' | 'absent' | 'half-day' | 'on-leave' | 'holiday' | 'wfh';
    notes?: string;
    breakSessions?: { start: string; end: string | null }[];
}

interface AppContextType {
    org: Organization | null;
    setOrg: (org: Organization) => void;
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;
    theme: 'light' | 'dark' | 'coffee';
    setTheme: (theme: 'light' | 'dark' | 'coffee') => void;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    attendanceRecords: AttendanceRecord[];
    setAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;
    deleteAttendanceRecord: (userId: string, date: string) => Promise<void>;
    selectedWeekStart: string;
    setSelectedWeekStart: (date: string) => void;
}

export const AppContext = createContext<AppContextType>({
    org: null,
    setOrg: () => { },
    currentUser: null,
    setCurrentUser: () => { },
    theme: 'dark',
    setTheme: () => { },
    sidebarCollapsed: false,
    setSidebarCollapsed: () => { },
    attendanceRecords: [],
    setAttendanceRecord: () => Promise.resolve(),
    deleteAttendanceRecord: () => Promise.resolve(),
    selectedWeekStart: currentWeekMonday(),
    setSelectedWeekStart: () => {},
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [theme, setThemeState] = useState<'light' | 'dark' | 'coffee'>('dark');
    const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [selectedWeekStart, setSelectedWeekStartState] = useState<string>(currentWeekMonday());
    const [prefLoadedFor, setPrefLoadedFor] = useState<string | null>(null);

    // Load user prefs from MongoDB whenever currentUser changes
    useEffect(() => {
        if (!currentUser) {
            // User logged out — reset prefs state so the next login loads fresh
            setPrefLoadedFor(null);
            setThemeState('dark');
            setSidebarCollapsedState(false);
            return;
        }
        if (prefLoadedFor === currentUser.id) return;
        // Reset to defaults before loading the new user's prefs to avoid showing previous user's theme
        setThemeState('dark');
        setSidebarCollapsedState(false);
        prefsApi().get(currentUser.id)
            .then((prefs: { theme?: 'light' | 'dark' | 'coffee'; sidebarCollapsed?: boolean; selectedWeekStart?: string | null } | null) => {
                if (!prefs) return;
                if (prefs.theme) setThemeState(prefs.theme);
                if (typeof prefs.sidebarCollapsed === 'boolean') setSidebarCollapsedState(prefs.sidebarCollapsed);
                if (prefs.selectedWeekStart) setSelectedWeekStartState(prefs.selectedWeekStart);
            })
            .catch((err: unknown) => console.error('[AppContext] Failed to load user prefs:', err))
            .finally(() => setPrefLoadedFor(currentUser.id));
    }, [currentUser, prefLoadedFor]);

    // Load org from MongoDB on mount
    useEffect(() => {
        let cancelled = false;
        dbApi().getOrg()
            .then((o: Organization | null) => { if (o) setOrg(o); })
            .catch((err: unknown) => console.error('[AppContext] Failed to load org:', err));

        const onFocus = () => {
            dbApi().getOrg().then((o: Organization | null) => { if (!cancelled && o) setOrg(o); }).catch(() => {});
        };
        window.addEventListener('focus', onFocus);

        return () => {
            cancelled = true;
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    // Load attendance from MongoDB on mount
    useEffect(() => {
        let cancelled = false;
        dbApi().getAttendance()
            .then((docs: AttendanceRecord[]) => {
                if (docs && docs.length > 0) setAttendanceRecords(docs);
            })
            .catch((err: unknown) => console.error('[AppContext] Failed to load attendance records:', err));

        const onFocus = () => {
            dbApi().getAttendance().then((docs: AttendanceRecord[]) => { if (!cancelled && docs) setAttendanceRecords(docs); }).catch(() => {});
        };
        window.addEventListener('focus', onFocus);

        return () => {
            cancelled = true;
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    // Real-time sync for attendance
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) return;
        const unsub = electronAPI.onAttendanceChanged?.((_: unknown, payload: { op: string; doc?: AttendanceRecord; id?: string }) => {
            const { op, doc } = payload;
            if (op === 'insert') {
                setAttendanceRecords(prev => prev.some(r => r.id === doc!.id) ? prev : [...prev, doc!]);
            } else if (op === 'update' || op === 'replace') {
                setAttendanceRecords(prev => {
                    const exists = prev.some(r => r.id === doc!.id);
                    return exists ? prev.map(r => r.id === doc!.id ? doc! : r) : [...prev, doc!];
                });
            } else if (op === 'delete') {
                dbApi().getAttendance().then((docs: AttendanceRecord[]) => setAttendanceRecords(docs)).catch(() => {});
            }
        });
        return () => { unsub?.(); };
    }, []);

    // Real-time sync for org
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) return;
        const unsub = electronAPI.onOrgChanged?.((_: unknown, payload: { op: string; doc?: Organization }) => {
            if (payload.doc) setOrg(payload.doc);
        });
        // Fix 7: refetch after DB reconnect
        const unsubReconnect = electronAPI.onDbReconnected?.(() => {
            dbApi().getOrg()
                .then((o: Organization | null) => { if (o) setOrg(o); })
                .catch(() => {});
            dbApi().getAttendance()
                .then((docs: AttendanceRecord[]) => { if (docs?.length) setAttendanceRecords(docs); })
                .catch(() => {});
        });
        return () => { unsub?.(); unsubReconnect?.(); };
    }, []);

    // Apply theme to DOM and sync Windows title bar color
    useEffect(() => {
        document.body.dataset.theme = theme;
        // Only relevant on Windows — no-op on other platforms
        const titleBarColors: Record<string, { bg: string; symbol: string }> = {
            dark:   { bg: '#1A1F35', symbol: '#CBD5E1' },
            coffee: { bg: '#1E120B', symbol: '#C4A98A' },
            light:  { bg: '#FFFFFF', symbol: '#374151' },
        };
        const c = titleBarColors[theme] ?? titleBarColors.dark;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).electronAPI?.setTitleBarColor?.(c.bg, c.symbol);
    }, [theme]);

    const setTheme = useCallback((t: 'light' | 'dark' | 'coffee') => {
        setThemeState(t);
        if (currentUser) {
            prefsApi().set({ userId: currentUser.id, theme: t })
                .catch((err: unknown) => console.error('[AppContext] Failed to save theme:', err));
        }
    }, [currentUser]);

    const setSidebarCollapsed = useCallback((collapsed: boolean) => {
        setSidebarCollapsedState(collapsed);
        if (currentUser) {
            prefsApi().set({ userId: currentUser.id, sidebarCollapsed: collapsed })
                .catch((err: unknown) => console.error('[AppContext] Failed to save sidebar state:', err));
        }
    }, [currentUser]);

    const setSelectedWeekStart = useCallback((date: string) => {
        setSelectedWeekStartState(date);
        if (currentUser) {
            prefsApi().set({ userId: currentUser.id, selectedWeekStart: date })
                .catch((err: unknown) => console.error('[AppContext] Failed to save week start:', err));
        }
    }, [currentUser]);

    const setAttendanceRecord = useCallback((record: Omit<AttendanceRecord, 'id'>): Promise<void> => {
        const id = `${record.userId}-${record.date}`;
        setAttendanceRecords(prev => {
            const idx = prev.findIndex(r => r.id === id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...record, id };
                return updated;
            }
            return [...prev, { ...record, id }];
        });
        return dbApi().setAttendance({ ...record })
            .then(() => {})
            .catch((err: unknown) => { console.error('[AppContext] Failed to persist attendance record:', err); });
    }, []);

    const deleteAttendanceRecord = useCallback((userId: string, date: string): Promise<void> => {
        setAttendanceRecords(prev => prev.filter(r => !(r.userId === userId && r.date === date)));
        return dbApi().deleteAttendance(userId, date)
            .then(() => {})
            .catch((err: unknown) => { console.error('[AppContext] Failed to delete attendance record:', err); });
    }, []);

    const value = useMemo(
        () => ({
            org,
            setOrg,
            currentUser,
            setCurrentUser,
            theme,
            setTheme,
            sidebarCollapsed,
            setSidebarCollapsed,
            attendanceRecords,
            setAttendanceRecord,
            deleteAttendanceRecord,
            selectedWeekStart,
            setSelectedWeekStart,
        }),
        [org, currentUser, theme, setTheme, sidebarCollapsed, setSidebarCollapsed, attendanceRecords, setAttendanceRecord, selectedWeekStart, setSelectedWeekStart]
    );

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
