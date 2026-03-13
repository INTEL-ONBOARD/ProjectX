import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { HashRouter, Routes, Route } from 'react-router-dom';
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
import BugReportModal from './components/ui/BugReportModal';

// Layout wrapper
const Layout: React.FC<{
    children: React.ReactNode;
    showProjectHeader?: boolean;
    onFilterChange?: (f: { priority: string; assignees: string[]; dueDateFilter: string }) => void;
    onTodayToggle?: (v: boolean) => void;
}> = ({
    children,
    showProjectHeader = false,
    onFilterChange,
    onTodayToggle,
}) => {
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
                className="flex-1 flex flex-col min-w-0 overflow-hidden"
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

// KanbanRoute bridges filter state between ProjectHeader and KanbanBoard
const KanbanRoute: React.FC = () => {
    const [filters, setFilters] = React.useState({ priority: 'all', assignees: [] as string[], dueDateFilter: 'all' });
    const [todayMode, setTodayMode] = React.useState(false);
    return (
        <Layout
            showProjectHeader={true}
            onFilterChange={setFilters}
            onTodayToggle={setTodayMode}
        >
            <KanbanBoard filters={filters} todayMode={todayMode} />
        </Layout>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
        <MembersProvider>
        <ProjectProvider>
        <HashRouter>
            <Routes>
                <Route path="/" element={<KanbanRoute />} />
                <Route
                    path="/messages"
                    element={
                        <Layout>
                            <MessagesPage />
                        </Layout>
                    }
                />
                <Route
                    path="/tasks"
                    element={
                        <Layout>
                            <TasksPage />
                        </Layout>
                    }
                />
                <Route
                    path="/members"
                    element={
                        <Layout>
                            <MembersPage />
                        </Layout>
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <Layout>
                            <DashboardPage />
                        </Layout>
                    }
                />
                <Route
                    path="/teams"
                    element={
                        <Layout>
                            <TeamsPage />
                        </Layout>
                    }
                />
                <Route
                    path="/attendance"
                    element={
                        <Layout>
                            <AttendancePage />
                        </Layout>
                    }
                />
                <Route
                    path="/reports"
                    element={
                        <Layout>
                            <ReportsPage />
                        </Layout>
                    }
                />
                <Route
                    path="/organization"
                    element={
                        <Layout>
                            <OrganizationPage />
                        </Layout>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <Layout>
                            <SettingsPage />
                        </Layout>
                    }
                />
            </Routes>
        </HashRouter>
        <BugReportModal />
        </ProjectProvider>
        </MembersProvider>
        </AppProvider>
    );
};

export default App;
