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
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#374151', background: '#F5F5F5', padding: 16, borderRadius: 8 }}>
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
import { MembersProvider } from './context/MembersContext';
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
        api.get(authUser.id).then((prefs: { themeMode: 'light'|'dark'|'system'; accentColor: string } | null) => {
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
        <div className="flex h-screen w-screen overflow-hidden bg-white">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                activeProject={activeProject}
                onProjectSelect={setActiveProject}
            />
            <motion.div
                className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white"
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
    return (
        <Routes>
            <Route path="/login" element={
                <LoginPage
                    onNavigateRegister={() => navigate('/register')}
                    onNavigateForgot={() => navigate('/forgot-password')}
                />
            } />
            <Route path="/register" element={
                <RegisterPage onNavigateLogin={() => navigate('/login')} />
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
    );
};

// ── Route guard ───────────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ path: string; children: React.ReactNode }> = ({ path, children }) => {
    const { user } = useAuth();
    const { getAllowedRoutes } = useRolePerms();
    const navigate = useNavigate();
    // Admins always have full access — never restrict them
    const isAdmin = user?.role === 'admin';
    const allowed = isAdmin ? null : getAllowedRoutes(user?.role ?? 'member');
    const blocked = !isAdmin && allowed !== null && !allowed.includes(path);
    useEffect(() => {
        if (blocked) navigate('/settings', { replace: true });
    }, [blocked, navigate]);
    if (blocked) return null;
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
const ReconnectingOverlay: React.FC = () => (
    <motion.div
        key="reconnecting"
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden"
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
            <span className="text-[11px] text-gray-300 tracking-widest uppercase font-medium">Reconnecting…</span>
        </motion.div>
    </motion.div>
);

// ── Root: manages splash → walkthrough → auth → app ──────────────────────────
const Root: React.FC = () => {
    const { isAuthenticated, isLoading, hasSeenWalkthrough, markWalkthroughSeen } = useAuth();
    const [splashDone, setSplashDone] = useState(false);
    const returningUser = !!localStorage.getItem('pm_auth_session');
    const [dbDisconnected, setDbDisconnected] = useState(false);
    const navigate = useNavigate();

    // When auth transitions to authenticated (e.g. after register), navigate to root
    React.useEffect(() => {
        if (isAuthenticated && splashDone && !isLoading) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, splashDone, isLoading]);

    // Listen for DB disconnect/reconnect events from main process
    React.useEffect(() => {
        // Layer 1: instant show on network loss; hide only after DB confirms reconnection
        const handleOffline = () => setDbDisconnected(true);
        window.addEventListener('offline', handleOffline);

        // Layer 2: mongoose events via Electron IPC
        // - disconnected: also triggers overlay as fallback (e.g. Atlas outage without internet drop)
        // - reconnected:  the ONLY thing that hides the overlay (DB is actually ready)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;
        if (!api) return () => {
            window.removeEventListener('offline', handleOffline);
        };
        const unsubDisconnect = api.onDbDisconnected?.(() => setDbDisconnected(true));
        const unsubReconnect  = api.onDbReconnected?.(() => setDbDisconnected(false));
        return () => {
            window.removeEventListener('offline', handleOffline);
            unsubDisconnect?.();
            unsubReconnect?.();
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
                {dbDisconnected && <ReconnectingOverlay />}
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
