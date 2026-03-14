import React, { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ProjectHeader from './components/layout/ProjectHeader';
import KanbanBoard from './components/dashboard/KanbanBoard';
import DashboardPage from './pages/DashboardPage';
import TeamsPage from './pages/TeamsPage';
import AttendancePage from './pages/AttendancePage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import OrganizationPage from './pages/OrganizationPage';
import MessagesPage from './pages/MessagesPage';
import TasksPage from './pages/TasksPage';
import MembersPage from './pages/MembersPage';
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
                role: authUser.role as User['role'],
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
        <Layout showProjectHeader onFilterChange={setFilters} onTodayToggle={setTodayMode}>
            <KanbanBoard filters={filters} todayMode={todayMode} />
        </Layout>
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

// ── Main app routes ───────────────────────────────────────────────────────────
const MainApp: React.FC = () => (
    <Routes>
        <Route path="/" element={<ProtectedRoute path="/"><KanbanRoute /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute path="/messages"><Layout><MessagesPage /></Layout></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute path="/tasks"><Layout><TasksPage /></Layout></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute path="/members"><Layout><MembersPage /></Layout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute path="/dashboard"><Layout><DashboardPage /></Layout></ProtectedRoute>} />
        <Route path="/teams" element={<ProtectedRoute path="/teams"><Layout><TeamsPage /></Layout></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute path="/attendance"><Layout><AttendancePage /></Layout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute path="/reports"><Layout><ReportsPage /></Layout></ProtectedRoute>} />
        <Route path="/organization" element={<ProtectedRoute path="/organization"><Layout><OrganizationPage /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
        <Route path="*" element={<ProtectedRoute path="/"><KanbanRoute /></ProtectedRoute>} />
    </Routes>
);

// ── Root: manages splash → walkthrough → auth → app ──────────────────────────
const Root: React.FC = () => {
    const { isAuthenticated, isLoading, hasSeenWalkthrough, markWalkthroughSeen } = useAuth();
    const [splashDone, setSplashDone] = useState(false);

    // 1. Splash (while isLoading is true AND splash not manually dismissed)
    if (isLoading && !splashDone) {
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
            <RolesProvider>
                <RolePermsProvider>
                    <MembersProvider>
                        <ProjectProvider>
                            <ToastProvider>
                                <HashRouter>
                                    <Root />
                                </HashRouter>
                            </ToastProvider>
                        </ProjectProvider>
                    </MembersProvider>
                </RolePermsProvider>
            </RolesProvider>
        </AppProvider>
    </AuthProvider>
);

export default App;
