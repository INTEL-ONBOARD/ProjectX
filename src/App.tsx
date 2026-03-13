import React, { useContext, useState } from 'react';
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
import { AppProvider, AppContext } from './context/AppContext';
import { MembersProvider } from './context/MembersContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import BugReportModal from './components/ui/BugReportModal';
import UpdateBanner from './components/ui/UpdateBanner';
import SplashScreen from './pages/auth/SplashScreen';
import WalkthroughScreen from './pages/auth/WalkthroughScreen';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

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

// ── Main app routes ───────────────────────────────────────────────────────────
const MainApp: React.FC = () => (
    <Routes>
        <Route path="/" element={<KanbanRoute />} />
        <Route path="/messages" element={<Layout><MessagesPage /></Layout>} />
        <Route path="/tasks" element={<Layout><TasksPage /></Layout>} />
        <Route path="/members" element={<Layout><MembersPage /></Layout>} />
        <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
        <Route path="/teams" element={<Layout><TeamsPage /></Layout>} />
        <Route path="/attendance" element={<Layout><AttendancePage /></Layout>} />
        <Route path="/reports" element={<Layout><ReportsPage /></Layout>} />
        <Route path="/organization" element={<Layout><OrganizationPage /></Layout>} />
        <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
        <Route path="*" element={<KanbanRoute />} />
    </Routes>
);

// ── Root: manages splash → walkthrough → auth → app ──────────────────────────
const Root: React.FC = () => {
    const { isAuthenticated, isLoading, hasSeenWalkthrough, markWalkthroughSeen } = useAuth();
    const [splashDone, setSplashDone] = useState(false);
    const [walkthroughDone, setWalkthroughDone] = useState(hasSeenWalkthrough);

    const handleWalkthroughComplete = () => {
        markWalkthroughSeen();
        setWalkthroughDone(true);
    };

    // 1. Splash (while isLoading is true AND splash not manually dismissed)
    if (isLoading && !splashDone) {
        return (
            <AnimatePresence>
                <SplashScreen onComplete={() => setSplashDone(true)} />
            </AnimatePresence>
        );
    }

    // 2. Walkthrough (first time only, after splash)
    if (!isAuthenticated && !walkthroughDone) {
        return (
            <AnimatePresence>
                <WalkthroughScreen onComplete={handleWalkthroughComplete} />
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
            <MembersProvider>
                <ProjectProvider>
                    <HashRouter>
                        <Root />
                    </HashRouter>
                </ProjectProvider>
            </MembersProvider>
        </AppProvider>
    </AuthProvider>
);

export default App;
