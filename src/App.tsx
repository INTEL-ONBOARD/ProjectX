import React, { useState } from 'react';
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
import { AppProvider } from './context/AppContext';
import BugReportModal from './components/ui/BugReportModal';

// Layout wrapper
const Layout: React.FC<{ children: React.ReactNode; showProjectHeader?: boolean }> = ({
    children,
    showProjectHeader = false,
}) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { projects, activeProject, setActiveProject } = useProjects();
    const currentProject = projects.find((p) => p.id === activeProject);

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
                {showProjectHeader && <ProjectHeader projectName={currentProject?.name ?? 'Mobile App'} projectId={activeProject} />}
                {children}
            </motion.div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
        <ProjectProvider>
        <HashRouter>
            <Routes>
                <Route
                    path="/"
                    element={
                        <Layout showProjectHeader={true}>
                            <KanbanBoard />
                        </Layout>
                    }
                />
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
        </AppProvider>
    );
};

export default App;
