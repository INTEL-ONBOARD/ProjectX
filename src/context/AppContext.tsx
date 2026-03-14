import React, { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';

const isMock = typeof window === 'undefined' || !(window as Window & { electronAPI?: { db?: unknown } }).electronAPI?.db;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;

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
    selectedWeekStart: '2020-12-14',
    setSelectedWeekStart: () => {},
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [org, setOrg] = useState<Organization | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [selectedWeekStart, setSelectedWeekStart] = useState<string>('2020-12-14');

    // Load attendance from MongoDB when running in Electron
    useEffect(() => {
        if (isMock) return;
        dbApi().getAttendance()
            .then((docs: AttendanceRecord[]) => {
                if (docs && docs.length > 0) setAttendanceRecords(docs);
            })
            .catch(console.error);
    }, []);

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
        // Persist to MongoDB
        if (!isMock) {
            dbApi().setAttendance({ ...record }).catch(console.error);
        }
    }, []);

    useEffect(() => {
        document.body.dataset.theme = theme;
    }, [theme]);

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
        [org, currentUser, theme, sidebarCollapsed, attendanceRecords, setAttendanceRecord, selectedWeekStart]
    );

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
