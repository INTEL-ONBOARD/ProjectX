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
    orgId: string;
    deptId?: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'admin' | 'manager' | 'member';
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
}

interface AppContextType {
    org: Organization | null;
    setOrg: (org: Organization) => void;
    currentUser: User | null;
    setCurrentUser: (user: User) => void;
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    attendanceRecords: AttendanceRecord[];
    setAttendanceRecord: (record: Omit<AttendanceRecord, 'id'>) => void;
    selectedWeekStart: string;
    setSelectedWeekStart: (date: string) => void;
}

export const AppContext = createContext<AppContextType>({
    org: null,
    setOrg: () => { },
    currentUser: null,
    setCurrentUser: () => { },
    theme: 'light',
    setTheme: () => { },
    sidebarCollapsed: false,
    setSidebarCollapsed: () => { },
    attendanceRecords: [],
    setAttendanceRecord: () => {},
    selectedWeekStart: currentWeekMonday(),
    setSelectedWeekStart: () => {},
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [theme, setThemeState] = useState<'light' | 'dark'>('light');
    const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [selectedWeekStart, setSelectedWeekStartState] = useState<string>(currentWeekMonday());
    const [prefLoadedFor, setPrefLoadedFor] = useState<string | null>(null);

    // Load user prefs from MongoDB whenever currentUser changes
    useEffect(() => {
        if (!currentUser) return;
        if (prefLoadedFor === currentUser.id) return;
        prefsApi().get(currentUser.id)
            .then((prefs: { theme?: 'light' | 'dark'; sidebarCollapsed?: boolean; selectedWeekStart?: string | null } | null) => {
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
        dbApi().getOrg()
            .then((o: Organization | null) => { if (o) setOrg(o); })
            .catch((err: unknown) => console.error('[AppContext] Failed to load org:', err));
    }, []);

    // Load attendance from MongoDB on mount
    useEffect(() => {
        dbApi().getAttendance()
            .then((docs: AttendanceRecord[]) => {
                if (docs && docs.length > 0) setAttendanceRecords(docs);
            })
            .catch((err: unknown) => console.error('[AppContext] Failed to load attendance records:', err));
    }, []);

    // Apply theme to DOM
    useEffect(() => {
        document.body.dataset.theme = theme;
    }, [theme]);

    const setTheme = useCallback((t: 'light' | 'dark') => {
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

    const setAttendanceRecord = useCallback((record: Omit<AttendanceRecord, 'id'>) => {
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
        dbApi().setAttendance({ ...record })
            .catch((err: unknown) => console.error('[AppContext] Failed to persist attendance record:', err));
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
