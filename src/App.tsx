import React, { useContext, useEffect, useState, Component } from 'react';

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error: Error) { return { error }; }
    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }
    render() {
        if (this.state.error) {
            return (
                <div style={{ padding: 40, fontFamily: 'monospace' }}>
                    <h2 style={{ color: '#D8727D' }}>Something went wrong</h2>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-muted)', padding: 16, borderRadius: 8 }}>
                        {this.state.error.message}{'\n\n'}{this.state.error.stack}
                    </pre>
                    <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '8px 16px', background: '#5030E5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
import { motion, AnimatePresence } from 'framer-motion';
import { HashRouter, Routes, Route, Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ProjectHeader from './components/layout/ProjectHeader';
import KanbanBoard from './components/dashboard/KanbanBoard';
import DashboardPage from './pages/DashboardPage';
import TeamsPage from './pages/TeamsPage';
import AttendancePage from './pages/AttendancePage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import MessagesPage from './pages/MessagesPage';
import TasksPage from './pages/TasksPage';
import MembersPage from './pages/MembersPage';
import UsersPage from './pages/UsersPage';
import { ProjectProvider, useProjects } from './context/ProjectContext';
import { AppProvider, AppContext, User } from './context/AppContext';
import { MembersProvider, useMembersContext } from './context/MembersContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RolePermsProvider, useRolePerms } from './context/RolePermsContext';
import { RolesProvider } from './context/RolesContext';
import { PresenceProvider } from './context/PresenceContext';
import { NotificationProvider } from './context/NotificationContext';
import BugReportModal from './components/ui/BugReportModal';
import UpdateBanner from './components/ui/UpdateBanner';
import { ToastProvider } from './components/ui/Toast';
import SplashScreen from './pages/auth/SplashScreen';
import WalkthroughScreen from './pages/auth/WalkthroughScreen';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// ── Sync AuthContext.user → AppContext.currentUser ────────────────────────────
const AuthAppSync: React.FC = () => {
    const { user: authUser } = useAuth();
    const { setCurrentUser } = useContext(AppContext);
    useEffect(() => {
        if (authUser) {
            setCurrentUser({
                id: authUser.id,
                name: authUser.name,
                email: authUser.email,
                role: authUser.role,
                status: 'active',
            });
        }
    }, [authUser?.id, authUser?.name, authUser?.email, authUser?.role]);
    return null;
};

// ── Apply appearance prefs to DOM once on login ───────────────────────────────
// Lives at app level so navigating away from / back to SettingsPage never
// causes a flash-to-default while the page re-fetches its own prefs.
const ACCENT_PALETTES: Record<string, Record<string, string>> = {
    '#5030E5': { 50:'#F0EDFF',100:'#E0DBFE',200:'#C2B7FD',300:'#A393FC',400:'#856FFB',500:'#5030E5',600:'#4024C4',700:'#301BA3',800:'#201182',900:'#100861' },
    '#0EA5E9': { 50:'#E0F4FD',100:'#BAE7FB',200:'#7DD4F8',300:'#39BFF4',400:'#0DB1E8',500:'#0EA5E9',600:'#0385C7',700:'#0267A0',800:'#044F7B',900:'#023B59' },
    '#10B981': { 50:'#D1FAF0',100:'#A5F3DC',200:'#6EE7C0',300:'#34D3A4',400:'#10C98E',500:'#10B981',600:'#059669',700:'#047857',800:'#065F46',900:'#064E3B' },
    '#F59E0B': { 50:'#FFFBEB',100:'#FEF3C7',200:'#FDE68A',300:'#FCD34D',400:'#FBBF24',500:'#F59E0B',600:'#D97706',700:'#B45309',800:'#92400E',900:'#78350F' },
    '#EF4444': { 50:'#FEF2F2',100:'#FEE2E2',200:'#FECACA',300:'#FCA5A5',400:'#F87171',500:'#EF4444',600:'#DC2626',700:'#B91C1C',800:'#991B1B',900:'#7F1D1D' },
    '#8B5CF6': { 50:'#F5F3FF',100:'#EDE9FE',200:'#DDD6FE',300:'#C4B5FD',400:'#A78BFA',500:'#8B5CF6',600:'#7C3AED',700:'#6D28D9',800:'#5B21B6',900:'#4C1D95' },
};
// Fix 5: use a per-user ref instead of a module-level boolean so appearance
// re-loads correctly when a different user logs in within the same process.
const AppearanceLoader: React.FC = () => {
    const { user: authUser } = useAuth();
    const { setTheme } = useContext(AppContext);
    const loadedForRef = React.useRef<string | null>(null);
    useEffect(() => {
        if (!authUser?.id || loadedForRef.current === authUser.id) return;
        loadedForRef.current = authUser.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI?.appearancePrefs;
        if (!api) return;
        api.get(authUser.id).then((prefs: { themeMode: 'light'|'dark'|'coffee'|'system'; accentColor: string } | null) => {
            if (!prefs) return;
            const palette = ACCENT_PALETTES[prefs.accentColor];
            if (palette) {
                const root = document.documentElement;
                Object.entries(palette).forEach(([shade, value]) => {
                    root.style.setProperty(`--color-primary-${shade}`, value as string);
                });
            }
            if (prefs.themeMode === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setTheme(prefersDark ? 'dark' : 'light');
            } else {
                setTheme(prefs.themeMode);
            }
        }).catch(() => { /* non-fatal */ });
    }, [authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Real-time sync: apply appearance changes made on other devices immediately
    useEffect(() => {
        if (!authUser?.id) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) return;
        const unsub = electronAPI.onAppearancePrefChanged?.((_: unknown, payload: { doc?: { userId: string; themeMode: 'light'|'dark'|'coffee'|'system'; accentColor: string } }) => {
            const doc = payload.doc;
            if (!doc || doc.userId !== authUser.id) return;
            const palette = ACCENT_PALETTES[doc.accentColor];
            if (palette) {
                const root = document.documentElement;
                Object.entries(palette).forEach(([shade, value]) => {
                    root.style.setProperty(`--color-primary-${shade}`, value as string);
                });
            }
            if (doc.themeMode === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setTheme(prefersDark ? 'dark' : 'light');
            } else {
                setTheme(doc.themeMode);
            }
        });
        return () => { unsub?.(); };
    }, [authUser?.id, setTheme]);
    return null;
};

// ── Layout wrapper ────────────────────────────────────────────────────────────
const Layout: React.FC<{
    children: React.ReactNode;
    showProjectHeader?: boolean;
    onFilterChange?: (f: { priority: string; assignees: string[]; dueDateFilter: string }) => void;
    onTodayToggle?: (v: boolean) => void;
}> = ({ children, showProjectHeader = false, onFilterChange, onTodayToggle }) => {
    const { sidebarCollapsed, setSidebarCollapsed } = useContext(AppContext);
    const { activeProject, setActiveProject } = useProjects();

    return (
        <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-app)' }}>
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                activeProject={activeProject}
                onProjectSelect={setActiveProject}
            />
            <motion.div
                className="flex-1 flex flex-col min-w-0 overflow-hidden"
                style={{ background: 'var(--bg-app)' }}
                layout
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
                <Header />
                {showProjectHeader && <ProjectHeader onFilterChange={onFilterChange} onTodayToggle={onTodayToggle} />}
                {children}
            </motion.div>
        </div>
    );
};

// ── KanbanRoute ───────────────────────────────────────────────────────────────
const KanbanRoute: React.FC = () => {
    const [filters, setFilters] = React.useState({ priority: 'all', assignees: [] as string[], dueDateFilter: 'all' });
    const [todayMode, setTodayMode] = React.useState(false);
    const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
    return (
        <>
            <ProjectHeader onFilterChange={setFilters} onTodayToggle={setTodayMode} onViewChange={setViewMode} />
            <KanbanBoard filters={filters} todayMode={todayMode} viewMode={viewMode} />
        </>
    );
};

// ── Auth screens (with navigate) ──────────────────────────────────────────────
const AuthScreens: React.FC = () => {
    const navigate = useNavigate();
    const { markWalkthroughSeen } = useAuth();
    const [showRegisteredModal, setShowRegisteredModal] = React.useState(false);

    const handleRegistered = React.useCallback(() => {
        markWalkthroughSeen(); // skip walkthrough — user just registered, no need to show it
        setShowRegisteredModal(true);
        navigate('/login');
        setTimeout(() => setShowRegisteredModal(false), 3000);
    }, [navigate, markWalkthroughSeen]);

    return (
        <>
            <Routes>
                <Route path="/login" element={
                    <LoginPage
                        onNavigateRegister={() => navigate('/register')}
                        onNavigateForgot={() => navigate('/forgot-password')}
                    />
                } />
                <Route path="/register" element={
                    <RegisterPage onNavigateLogin={() => navigate('/login')} onRegistered={handleRegistered} />
                } />
                <Route path="/forgot-password" element={
                    <ForgotPasswordPage onNavigateLogin={() => navigate('/login')} />
                } />
                <Route path="*" element={
                    <LoginPage
                        onNavigateRegister={() => navigate('/register')}
                        onNavigateForgot={() => navigate('/forgot-password')}
                    />
                } />
            </Routes>

            {/* Registration success modal — lives outside Routes so it survives navigation */}
            <AnimatePresence>
                {showRegisteredModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="rounded-2xl p-8 flex flex-col items-center text-center gap-4 shadow-2xl mx-4"
                            style={{ background: 'var(--bg-card)', maxWidth: 380, width: '100%' }}>
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                                className="w-16 h-16 rounded-full flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg, #5030E5, #6B44F8)' }}>
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </motion.div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Account Created!</h2>
                                <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                    Your account is pending admin approval. Contact your admin to get access.
                                </p>
                            </div>
                            <div className="w-full rounded-full h-1 overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                                <motion.div
                                    initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 3, ease: 'linear' }}
                                    className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #5030E5, #6B44F8)' }} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

// ── Permission-denied modal ───────────────────────────────────────────────────
const PermissionDeniedModal: React.FC<{ path: string; onClose: () => void }> = ({ path, onClose }) => {
    const { user } = useAuth();
    const { members } = useMembersContext();
    const [requested, setRequested] = React.useState(false);
    const [sending, setSending] = React.useState(false);

    const pageName = path === '/' ? 'Task Board'
        : path.slice(1).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const handleRequest = async () => {
        if (!user || requested) return;
        setSending(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const electronAPI = (window as any).electronAPI;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let allMembers: any[] = members;
            // Fallback: fetch directly if context hasn't loaded yet
            if (allMembers.length === 0) {
                allMembers = await electronAPI.db.getMembers();
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const admins = allMembers.filter((m: any) => m.role === 'admin');
            const refId = `permreq-${user.id}-${path}-${Date.now()}`;
            for (const admin of admins) {
                await electronAPI.notifs.create({
                    userId: admin.id,
                    type: 'permission_request',
                    title: `${user.name} requested access`,
                    body: `Wants permission to access ${pageName}`,
                    refId,
                });
            }
            setRequested(true);
            // Auto-close after showing success for 2s
            setTimeout(() => onClose(), 2000);
        } catch (err) {
            console.error('[PermissionDeniedModal] Failed to send permission request:', err);
        }
        setSending(false);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.45)' }}>
            <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl p-8 w-full max-w-sm mx-4 flex flex-col items-center text-center"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
            >
                <AnimatePresence mode="wait">
                    {!requested ? (
                        <motion.div key="locked" className="flex flex-col items-center w-full"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.18 }}
                        >
                            {/* Lock icon */}
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(220,38,38,0.12)' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Access Restricted</h2>
                            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                                You don't have permission to access <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{pageName}</span>.
                            </p>
                            <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Contact your admin or request access below.</p>
                            <div className="flex flex-col gap-2.5 w-full">
                                <button
                                    onClick={handleRequest}
                                    disabled={sending}
                                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-60 bg-primary-500 hover:bg-primary-600"
                                >
                                    {sending ? 'Sending…' : 'Request Permission'}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Go Back
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="success" className="flex flex-col items-center w-full py-4"
                            initial={{ opacity: 0, scale: 0.85, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {/* Success checkmark */}
                            <motion.div
                                className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                                style={{ background: 'rgba(34,197,94,0.15)' }}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                            >
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </motion.div>
                            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Request Sent!</h2>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Your request has been sent to the admin. You'll be notified once access is granted.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

// ── Route guard ───────────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ path: string; children: React.ReactNode }> = ({ path, children }) => {
    const { user } = useAuth();
    const { getAllowedRoutes } = useRolePerms();
    const navigate = useNavigate();
    const [showDenied, setShowDenied] = React.useState(false);
    // Admins always have full access — never restrict them
    const isAdmin = user?.role === 'admin';
    const allowed = isAdmin ? null : getAllowedRoutes(user?.role ?? 'member');
    const blocked = !isAdmin && allowed !== null && !allowed.includes(path);

    useEffect(() => {
        if (blocked) setShowDenied(true);
    }, [blocked]);

    if (blocked) {
        return (
            <AnimatePresence>
                {showDenied && (
                    <PermissionDeniedModal
                        path={path}
                        onClose={() => { setShowDenied(false); navigate(-1); }}
                    />
                )}
            </AnimatePresence>
        );
    }
    return <>{children}</>;
};

// ── Shared layout wrapper for all non-kanban routes ───────────────────────────
const SharedLayout: React.FC = () => (
    <Layout><Outlet /></Layout>
);

// ── Main app routes ───────────────────────────────────────────────────────────
const MainApp: React.FC = () => (
    <Routes>
        <Route element={<SharedLayout />}>
            <Route path="/"           element={<ProtectedRoute path="/"><KanbanRoute /></ProtectedRoute>} />
            <Route path="/messages"   element={<ProtectedRoute path="/messages"><MessagesPage /></ProtectedRoute>} />
            <Route path="/tasks"      element={<ProtectedRoute path="/tasks"><TasksPage /></ProtectedRoute>} />
            <Route path="/members"    element={<ProtectedRoute path="/members"><MembersPage /></ProtectedRoute>} />
            <Route path="/dashboard"  element={<ProtectedRoute path="/dashboard"><DashboardPage /></ProtectedRoute>} />
            <Route path="/teams"      element={<ProtectedRoute path="/teams"><TeamsPage /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute path="/attendance"><AttendancePage /></ProtectedRoute>} />
            <Route path="/reports"    element={<ProtectedRoute path="/reports"><ReportsPage /></ProtectedRoute>} />
            <Route path="/users"      element={<ProtectedRoute path="/users"><UsersPage /></ProtectedRoute>} />
            <Route path="/settings"   element={<SettingsPage />} />
        </Route>
    </Routes>
);

// ── Reconnecting overlay ──────────────────────────────────────────────────────
const ReconnectingOverlay: React.FC<{ status?: 'reconnecting' | 'failed' | 'slow' }> = ({ status = 'reconnecting' }) => {
    const label = status === 'failed' ? 'Connection failed — retrying…' : status === 'slow' ? 'Still reconnecting…' : 'Reconnecting…';
    return (
    <motion.div
        key="reconnecting"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'var(--bg-app)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
    >
        <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(80,48,229,0.06) 0%, transparent 70%)' }} />
        <div className="flex flex-col items-center gap-6 select-none">
            <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className="relative"
            >
                <div className="w-20 h-20 rounded-[22px] bg-primary-500 flex items-center justify-center shadow-[0_20px_60px_rgba(80,48,229,0.35)]">
                    <span style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: '-0.05em', lineHeight: 1 }}>M</span>
                </div>
                <motion.div
                    className="absolute inset-0 rounded-[22px] border-2 border-primary-300"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1.2, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.4 }}
                />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="flex flex-col items-center gap-1"
            >
                <span className="text-3xl font-bold text-gray-900 tracking-tight">Project M.</span>
                <span className="text-sm text-gray-400 font-normal tracking-wide">Manage smarter. Deliver faster.</span>
            </motion.div>
        </div>
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="absolute bottom-14 flex flex-col items-center gap-3"
        >
            <div className="w-48 h-[2px] rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                    className="h-full rounded-full bg-primary-500"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
                />
            </div>
            <span className="text-[11px] text-gray-300 tracking-widest uppercase font-medium">{label}</span>
        </motion.div>
    </motion.div>
    );
};

// ── Root: manages splash → walkthrough → auth → app ──────────────────────────
const Root: React.FC = () => {
    const { isAuthenticated, isLoading, hasSeenWalkthrough, markWalkthroughSeen } = useAuth();
    const [splashDone, setSplashDone] = useState(false);
    const returningUser = !!localStorage.getItem('pm_auth_session');
    const [dbDisconnected, setDbDisconnected] = useState(false);
    const [reconnectStatus, setReconnectStatus] = useState<'reconnecting' | 'failed' | 'slow'>('reconnecting');
    const reconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const navigate = useNavigate();

    // When auth transitions to authenticated (e.g. after register), navigate to root
    React.useEffect(() => {
        if (isAuthenticated && splashDone && !isLoading) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, splashDone, isLoading]);

    // Listen for DB disconnect/reconnect events from main process
    React.useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;

        const showOverlay = () => {
            setDbDisconnected(true);
            setReconnectStatus('reconnecting');
            // Safety timeout: if DB hasn't reconnected in 15s, trigger force-reconnect and update label
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => {
                setReconnectStatus('slow');
                api?.forceReconnect?.().catch(() => {});
            }, 15000);
        };

        const hideOverlay = () => {
            if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
            setDbDisconnected(false);
            setReconnectStatus('reconnecting');
        };

        // Layer 1: instant show on network loss; hide only after DB confirms reconnection
        const handleOffline = () => showOverlay();
        // Network restored — don't clear overlay yet; wait for DB to confirm reconnection
        const handleOnline = () => console.log('[App] Network restored — waiting for DB reconnect...');
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        // Layer 2: mongoose events via Electron IPC
        if (!api) return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
        const unsubDisconnect    = api.onDbDisconnected?.(() => showOverlay());
        const unsubReconnect     = api.onDbReconnected?.(() => hideOverlay());
        const unsubConnFailed    = api.onDbConnectionFailed?.(() => setReconnectStatus('failed'));
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            unsubDisconnect?.();
            unsubReconnect?.();
            unsubConnFailed?.();
        };
    }, []);

    // 1. Splash — show until both the animation completes AND auth has resolved
    if (!splashDone || isLoading) {
        return (
            <AnimatePresence>
                <SplashScreen onComplete={() => setSplashDone(true)} duration={returningUser ? 1200 : 2800} />
            </AnimatePresence>
        );
    }

    // 2. Walkthrough (first time only, after splash)
    if (!isAuthenticated && !hasSeenWalkthrough) {
        return (
            <AnimatePresence>
                <WalkthroughScreen onComplete={markWalkthroughSeen} />
            </AnimatePresence>
        );
    }

    // 3. Auth screens (login / register / forgot)
    if (!isAuthenticated) {
        return <AuthScreens />;
    }

    // 4. Main app (with reconnecting overlay when DB drops)
    return (
        <>
            <MainApp />
            <BugReportModal />
            <UpdateBanner />
            <AnimatePresence>
                {dbDisconnected && <ReconnectingOverlay status={reconnectStatus} />}
            </AnimatePresence>
        </>
    );
};

// ── App ───────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
    <ErrorBoundary>
    <AuthProvider>
        <AppProvider>
            <AuthAppSync />
            <AppearanceLoader />
            <RolePermsProvider>
                <RolesProvider>
                <MembersProvider>
                    <PresenceProvider>
                        <ProjectProvider>
                            <NotificationProvider>
                                <ToastProvider>
                                    <HashRouter>
                                        <Root />
                                    </HashRouter>
                                </ToastProvider>
                            </NotificationProvider>
                        </ProjectProvider>
                    </PresenceProvider>
                </MembersProvider>
                </RolesProvider>
            </RolePermsProvider>
        </AppProvider>
    </AuthProvider>
    </ErrorBoundary>
);

export default App;
