import React, { createContext, useContext, useState, useEffect } from 'react';
import { memberColors } from '../data/mockData';
import { User } from '../types';

const isMock = typeof window === 'undefined' || !(window as Window & { electronAPI?: { db?: unknown } }).electronAPI?.db;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = () => (window as any).electronAPI.db;

interface MembersContextValue {
  members: User[];
  getMemberColor: (id: string) => string;
  addMember: (member: Omit<User, 'id'>) => Promise<void>;
  updateMember: (id: string, changes: Partial<Omit<User, 'id'>>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
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
    if (isMock) return;
    api().getMembers()
      .then((docs: User[]) => setMembers(docs))
      .catch((err: unknown) => console.error('[MembersContext] Failed to load members:', err));
  }, []);

  const getMemberColor = (id: string): string => {
    const idx = members.findIndex(m => m.id === id);
    if (idx === -1) return memberColors[0];
    return memberColors[idx % memberColors.length];
  };

  const addMember = async (member: Omit<User, 'id'>) => {
    if (isMock) {
      const newMember: User = { ...member, id: `u${Date.now()}` };
      setMembers(prev => [...prev, newMember]);
      return;
    }
    const newMember = await api().addMember(member) as User;
    setMembers(prev => [...prev, newMember]);
  };

  const updateMember = async (id: string, changes: Partial<Omit<User, 'id'>>) => {
    if (isMock) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...changes } : m));
      return;
    }
    await api().updateMember(id, changes);
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...changes } : m));
  };

  const removeMember = async (id: string) => {
    if (isMock) {
      setMembers(prev => prev.filter(m => m.id !== id));
      return;
    }
    await api().removeMember(id);
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  return (
    <MembersContext.Provider value={{ members, getMemberColor, addMember, updateMember, removeMember }}>
      {children}
    </MembersContext.Provider>
  );
};
