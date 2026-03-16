import React, { useContext, useEffect, useState } from 'react';
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
    return (
        <>
            <ProjectHeader onFilterChange={setFilters} onTodayToggle={setTodayMode} />
            <KanbanBoard filters={filters} todayMode={todayMode} />
        </>
    );
};

// ── Auth screens (with navigate) ──────────────────────────────────────────────
const AuthScreens: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
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
        </AnimatePresence>
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

    // Listen for DB disconnect/reconnect events from main process
    React.useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;
        if (!api) return;
        const unsubDisconnect = api.onDbDisconnected?.(() => setDbDisconnected(true));
        const unsubReconnect = api.onDbReconnected?.(() => setDbDisconnected(false));
        return () => { unsubDisconnect?.(); unsubReconnect?.(); };
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
    <AuthProvider>
        <AppProvider>
            <AuthAppSync />
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
);

export default App;
