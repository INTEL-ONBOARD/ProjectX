import React, { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HashRouter, Routes, Route, Outlet, useNavigate } from 'react-router-dom';
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

// ── Root: manages splash → walkthrough → auth → app ──────────────────────────
const Root: React.FC = () => {
    const { isAuthenticated, isLoading, hasSeenWalkthrough, markWalkthroughSeen } = useAuth();
    const [splashDone, setSplashDone] = useState(() => !!localStorage.getItem('pm_auth_session'));

    // 1. Splash (while isLoading is true AND splash not manually dismissed)
    if (isLoading) {
        if (splashDone) return null; // already logged in — wait silently for session restore
        return (
            <AnimatePresence>
                <SplashScreen onComplete={() => setSplashDone(true)} />
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
        return (
            <AnimatePresence mode="wait">
                <AuthScreens />
            </AnimatePresence>
        );
    }

    // 4. Main app
    return (
        <>
            <MainApp />
            <BugReportModal />
            <UpdateBanner />
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
                    <ProjectProvider>
                        <ToastProvider>
                            <HashRouter>
                                <Root />
                            </HashRouter>
                        </ToastProvider>
                    </ProjectProvider>
                </MembersProvider>
                </RolesProvider>
            </RolePermsProvider>
        </AppProvider>
    </AuthProvider>
);

export default App;
