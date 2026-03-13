import React, { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';

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
});

const SEED_ATTENDANCE: Omit<AttendanceRecord, 'id'>[] = [
    { userId: 'u1', date: '2020-12-01', status: 'present' },
    { userId: 'u1', date: '2020-12-02', status: 'present' },
    { userId: 'u1', date: '2020-12-03', status: 'present' },
    { userId: 'u1', date: '2020-12-04', status: 'present' },
    { userId: 'u1', date: '2020-12-05', status: 'present' },
    { userId: 'u2', date: '2020-12-01', status: 'present' },
    { userId: 'u2', date: '2020-12-02', status: 'present' },
    { userId: 'u2', date: '2020-12-03', status: 'absent' },
    { userId: 'u2', date: '2020-12-04', status: 'present' },
    { userId: 'u2', date: '2020-12-05', status: 'present' },
    { userId: 'u3', date: '2020-12-01', status: 'present' },
    { userId: 'u3', date: '2020-12-02', status: 'present' },
    { userId: 'u3', date: '2020-12-03', status: 'present' },
    { userId: 'u3', date: '2020-12-04', status: 'present' },
    { userId: 'u3', date: '2020-12-05', status: 'absent' },
    { userId: 'u4', date: '2020-12-01', status: 'present' },
    { userId: 'u4', date: '2020-12-02', status: 'absent' },
    { userId: 'u4', date: '2020-12-03', status: 'present' },
    { userId: 'u4', date: '2020-12-04', status: 'present' },
    { userId: 'u4', date: '2020-12-05', status: 'present' },
    { userId: 'u5', date: '2020-12-01', status: 'present' },
    { userId: 'u5', date: '2020-12-02', status: 'present' },
    { userId: 'u5', date: '2020-12-03', status: 'present' },
    { userId: 'u5', date: '2020-12-04', status: 'absent' },
    { userId: 'u5', date: '2020-12-05', status: 'present' },
    { userId: 'u6', date: '2020-12-01', status: 'absent' },
    { userId: 'u6', date: '2020-12-02', status: 'present' },
    { userId: 'u6', date: '2020-12-03', status: 'present' },
    { userId: 'u6', date: '2020-12-04', status: 'present' },
    { userId: 'u6', date: '2020-12-05', status: 'present' },
];

const seedRecords: AttendanceRecord[] = SEED_ATTENDANCE.map(r => ({
    ...r,
    id: `${r.userId}-${r.date}`,
}));

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [org, setOrg] = useState<Organization | null>({
        id: 'org1',
        name: 'TechCorp',
        workStart: '09:00',
        workEnd: '18:00',
        createdAt: new Date().toISOString(),
    });

    const [currentUser, setCurrentUser] = useState<User | null>({
        id: 'u1',
        orgId: 'org1',
        name: 'Anima Agrawal',
        email: 'anima@techcorp.com',
        role: 'admin',
        status: 'active',
        designation: 'Project Manager',
    });

    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(seedRecords);

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
        }),
        [org, currentUser, theme, sidebarCollapsed, attendanceRecords, setAttendanceRecord]
    );

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
