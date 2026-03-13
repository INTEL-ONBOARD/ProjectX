import React, { createContext, useContext, useState } from 'react';
import { projects as initialProjects, todoTasks, inProgressTasks, doneTasks } from '../data/mockData';
import { Project, Task, TaskStatus } from '../types';

interface ProjectContextValue {
  projects: Project[];
  allTasks: Task[];
  activeProject: string;
  setActiveProject: (id: string) => void;
  createProject: (name: string, color: string) => void;
  updateProject: (id: string, changes: Partial<Pick<Project, 'name' | 'color'>>) => void;
  deleteProject: (id: string) => void;
  createTask: (task: Omit<Task, 'id'> & { projectId?: string }) => void;
  updateTask: (id: string, changes: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: TaskStatus) => void;
  scrubAssignee: (memberId: string) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const useProjects = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectProvider');
  return ctx;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [allTasks, setAllTasks] = useState<Task[]>([
    ...todoTasks, ...inProgressTasks, ...doneTasks,
  ]);
  const [activeProject, setActiveProject] = useState<string>('p1');

  const createProject = (name: string, color: string) => {
    const newProject: Project = { id: `p${Date.now()}`, name, color, tasks: [] };
    setProjects(prev => [...prev, newProject]);
  };

  const updateProject = (id: string, changes: Partial<Pick<Project, 'name' | 'color'>>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => {
      const remaining = prev.filter(p => p.id !== id);
      setActiveProject(ap => ap === id ? (remaining[0]?.id ?? '') : ap);
      return remaining;
    });
    setAllTasks(prev => prev.map(t => t.projectId === id ? { ...t, projectId: undefined } : t));
  };

  const createTask = (taskData: Omit<Task, 'id'> & { projectId?: string }) => {
    const newTask: Task = { ...taskData, id: `t${Date.now()}` };
    setAllTasks(prev => [...prev, newTask]);
    if (taskData.projectId) {
      setProjects(prev => prev.map(p =>
        p.id === taskData.projectId ? { ...p, tasks: [...p.tasks, newTask] } : p
      ));
    }
  };

  const updateTask = (id: string, changes: Partial<Omit<Task, 'id'>>) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
  };

  const deleteTask = (id: string) => {
    setAllTasks(prev => prev.filter(t => t.id !== id));
  };

  const moveTask = (id: string, newStatus: TaskStatus) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const scrubAssignee = (memberId: string) => {
    setAllTasks(prev =>
      prev.map(t => ({ ...t, assignees: t.assignees.filter(a => a !== memberId) }))
    );
  };

  return (
    <ProjectContext.Provider value={{
      projects, allTasks, activeProject, setActiveProject,
      createProject, updateProject, deleteProject,
      createTask, updateTask, deleteTask, moveTask, scrubAssignee,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};
