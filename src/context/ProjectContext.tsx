import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Task, TaskStatus } from '../types';


const isMock = typeof window === 'undefined' || !(window as Window & { electronAPI?: { db?: unknown } }).electronAPI?.db;

interface ProjectContextValue {
  projects: Project[];
  allTasks: Task[];
  activeProject: string;
  setActiveProject: (id: string) => void;
  createProject: (name: string, color: string) => Promise<void>;
  updateProject: (id: string, changes: Partial<Pick<Project, 'name' | 'color'>>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createTask: (task: Omit<Task, 'id'> & { projectId?: string }) => Promise<void>;
  updateTask: (id: string, changes: Partial<Omit<Task, 'id'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, newStatus: TaskStatus) => Promise<void>;
  scrubAssignee: (memberId: string) => Promise<void>;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const useProjects = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectProvider');
  return ctx;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = () => (window as any).electronAPI.db;

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [activeProject, setActiveProject] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMock) {
      setLoading(false);
      return;
    }

    Promise.all([api().getProjects(), api().getTasks()])
      .then(([prjs, tasks]) => {
        const typedProjects = prjs as Project[];
        const typedTasks = tasks as Task[];
        setProjects(typedProjects);
        setAllTasks(typedTasks);
        setActiveProject(typedProjects[0]?.id ?? '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const createProject = async (name: string, color: string) => {
    if (isMock) {
      const newProject: Project = { id: `p${Date.now()}`, name, color, tasks: [] };
      setProjects(prev => [...prev, newProject]);
      return;
    }
    const newProject = await api().createProject(name, color) as Project;
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = async (id: string, changes: Partial<Pick<Project, 'name' | 'color'>>) => {
    if (isMock) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
      return;
    }
    await api().updateProject(id, changes);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  const deleteProject = async (id: string) => {
    if (isMock) {
      setProjects(prev => {
        const remaining = prev.filter(p => p.id !== id);
        setActiveProject(ap => ap === id ? (remaining[0]?.id ?? '') : ap);
        return remaining;
      });
      setAllTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined } : t));
      return;
    }
    await api().deleteProject(id);
    setProjects(prev => {
      const remaining = prev.filter(p => p.id !== id);
      setActiveProject(ap => ap === id ? (remaining[0]?.id ?? '') : ap);
      return remaining;
    });
    setAllTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined } : t));
  };

  const createTask = async (taskData: Omit<Task, 'id'> & { projectId?: string }) => {
    if (isMock) {
      const newTask: Task = { ...taskData, id: `t${Date.now()}` };
      setAllTasks(prev => [...prev, newTask]);
      return;
    }
    const newTask = await api().createTask(taskData) as Task;
    setAllTasks(prev => [...prev, newTask]);
  };

  const updateTask = async (id: string, changes: Partial<Omit<Task, 'id'>>) => {
    if (isMock) {
      setAllTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
      return;
    }
    await api().updateTask(id, changes);
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
  };

  const deleteTask = async (id: string) => {
    if (isMock) {
      setAllTasks(prev => prev.filter(t => t.id !== id));
      return;
    }
    await api().deleteTask(id);
    setAllTasks(prev => prev.filter(t => t.id !== id));
  };

  const moveTask = async (id: string, newStatus: TaskStatus) => {
    if (isMock) {
      setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      return;
    }
    await api().moveTask(id, newStatus);
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const scrubAssignee = async (memberId: string) => {
    if (isMock) {
      setAllTasks(prev => prev.map(t => ({ ...t, assignees: t.assignees.filter(a => a !== memberId) })));
      return;
    }
    await api().scrubAssignee(memberId);
    setAllTasks(prev => prev.map(t => ({ ...t, assignees: t.assignees.filter(a => a !== memberId) })));
  };

  return (
    <ProjectContext.Provider value={{
      projects, allTasks, activeProject, setActiveProject, loading,
      createProject, updateProject, deleteProject,
      createTask, updateTask, deleteTask, moveTask, scrubAssignee,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
