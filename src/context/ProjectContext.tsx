import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Task, TaskStatus } from '../types';
import { useAuth } from './AuthContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = () => (window as any).electronAPI.db;

interface ProjectContextValue {
  projects: Project[];
  allTasks: Task[];
  activeProject: string;
  setActiveProject: (id: string) => void;
  createProject: (name: string, color: string) => Promise<Project>;
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

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [activeProject, setActiveProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth() ?? { user: null };

  useEffect(() => {
    Promise.all([api().getProjects(), api().getTasks()])
      .then(([prjs, tasks]) => {
        const typedProjects = prjs as Project[];
        const typedTasks = tasks as Task[];
        setProjects(typedProjects);
        setAllTasks(typedTasks);
        setActiveProject(typedProjects[0]?.id ?? '');
      })
      .catch(err => console.error('[ProjectContext] Failed to load projects/tasks:', err))
      .finally(() => setLoading(false));
  }, []);

  // Real-time sync: listen for project/task changes from other clients via MongoDB change streams
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    const unsubProject = electronAPI.onProjectChanged?.((_: unknown, payload: { op: string; doc?: Project; id?: string }) => {
      const { op, doc } = payload;
      if (op === 'insert') {
        setProjects(prev => prev.some(p => p.id === doc!.id) ? prev : [...prev, doc!]);
      } else if (op === 'update' || op === 'replace') {
        setProjects(prev => {
          const exists = prev.some(p => p.id === doc!.id);
          return exists ? prev.map(p => p.id === doc!.id ? doc! : p) : [...prev, doc!];
        });
      } else if (op === 'delete') {
        // For deletes the stream gives _id not appId — refetch to stay in sync
        api().getProjects().then((prjs: Project[]) => {
          setProjects(prjs);
          setActiveProject(ap => prjs.some(p => p.id === ap) ? ap : (prjs[0]?.id ?? ''));
        }).catch(() => {});
      }
    });

    const unsubTask = electronAPI.onTaskChanged?.((_: unknown, payload: { op: string; doc?: Task; id?: string }) => {
      const { op, doc } = payload;
      if (op === 'insert') {
        setAllTasks(prev => prev.some(t => t.id === doc!.id) ? prev : [...prev, doc!]);
      } else if (op === 'update' || op === 'replace') {
        setAllTasks(prev => {
          const exists = prev.some(t => t.id === doc!.id);
          return exists ? prev.map(t => t.id === doc!.id ? doc! : t) : [...prev, doc!];
        });
      } else if (op === 'delete') {
        api().getTasks().then((tasks: Task[]) => setAllTasks(tasks)).catch(() => {});
      }
    });

    // Fix 7: refetch after DB reconnect so changes made while offline are reflected
    const unsubReconnect = electronAPI.onDbReconnected?.(() => {
      Promise.all([api().getProjects(), api().getTasks()])
        .then(([prjs, tasks]) => {
          setProjects(prjs as Project[]);
          setAllTasks(tasks as Task[]);
        })
        .catch(() => {});
    });

    return () => { unsubProject?.(); unsubTask?.(); unsubReconnect?.(); };
  }, []);

  const createProject = async (name: string, color: string): Promise<Project> => {
    const newProject = await api().createProject(name, color) as Project;
    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const updateProject = async (id: string, changes: Partial<Pick<Project, 'name' | 'color'>>) => {
    await api().updateProject(id, changes);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  const deleteProject = async (id: string) => {
    await api().deleteProject(id);
    setProjects(prev => {
      const remaining = prev.filter(p => p.id !== id);
      setActiveProject(ap => ap === id ? (remaining[0]?.id ?? '') : ap);
      return remaining;
    });
    setAllTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined } : t));
  };

  const createTask = async (taskData: Omit<Task, 'id'> & { projectId?: string }) => {
    const actorMeta = { actorId: authUser?.id ?? '', actorName: authUser?.name ?? '' };
    const newTask = await api().createTask({ ...taskData, ...actorMeta }) as Task;
    setAllTasks(prev => [...prev, newTask]);
  };

  const updateTask = async (id: string, changes: Partial<Omit<Task, 'id'>>) => {
    const actorMeta = { actorId: authUser?.id ?? '', actorName: authUser?.name ?? '' };
    const updated = await api().updateTask(id, { ...changes, ...actorMeta }) as Task | null;
    if (updated) {
      setAllTasks(prev => prev.map(t => t.id === id ? updated : t));
    } else {
      setAllTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
    }
  };

  const deleteTask = async (id: string) => {
    await api().deleteTask(id);
    setAllTasks(prev => prev.filter(t => t.id !== id));
  };

  const moveTask = async (id: string, newStatus: TaskStatus) => {
    const actorMeta = { actorId: authUser?.id ?? '', actorName: authUser?.name ?? '' };
    const moved = await api().moveTask(id, newStatus, actorMeta.actorId, actorMeta.actorName) as Task | null;
    if (moved) {
      setAllTasks(prev => prev.map(t => t.id === id ? moved : t));
    } else {
      setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    }
  };

  const scrubAssignee = async (memberId: string) => {
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
