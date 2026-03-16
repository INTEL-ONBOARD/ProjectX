import React, { createContext, useContext, useState, useEffect } from 'react';
import { memberColors } from '../data/mockData';
import { User } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = () => (window as any).electronAPI.db;

interface MembersContextValue {
  members: User[];
  getMemberColor: (id: string) => string;
  addMember: (member: Omit<User, 'id'>) => Promise<void>;
  updateMember: (id: string, changes: Partial<Omit<User, 'id'>>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  refetchMembers: () => Promise<void>;
}

const MembersContext = createContext<MembersContextValue | null>(null);

export const useMembersContext = () => {
  const ctx = useContext(MembersContext);
  if (!ctx) throw new Error('useMembersContext must be used within MembersProvider');
  return ctx;
};

export const MembersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<User[]>([]);

  useEffect(() => {
    let cancelled = false;
    api().getMembers()
      .then((docs: User[]) => { if (!cancelled) setMembers(docs as User[]); })
      .catch((err: unknown) => console.error('[MembersContext] Failed to load members:', err));
    return () => { cancelled = true; };
  }, []);

  const getMemberColor = (id: string): string => {
    if (!id) return memberColors[0];
    // Hash the id so color is stable regardless of list order or deletions
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return memberColors[hash % memberColors.length];
  };

  const addMember = async (member: Omit<User, 'id'>) => {
    const newMember = await api().addMember(member) as User;
    setMembers(prev => [...prev, newMember]);
  };

  const updateMember = async (id: string, changes: Partial<Omit<User, 'id'>>) => {
    await api().updateMember(id, changes);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...changes } : m));
  };

  const removeMember = async (id: string) => {
    await api().removeMember(id);
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const refetchMembers = async () => {
    const docs = await api().getMembers() as User[];
    setMembers(docs);
  };

  return (
    <MembersContext.Provider value={{ members, getMemberColor, addMember, updateMember, removeMember, refetchMembers }}>
      {children}
    </MembersContext.Provider>
  );
};
