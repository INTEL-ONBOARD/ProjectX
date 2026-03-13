import React, { createContext, useContext, useState } from 'react';
import { teamMembers, memberColors } from '../data/mockData';
import { User } from '../types';

interface MembersContextValue {
  members: User[];
  getMemberColor: (id: string) => string;
  addMember: (member: Omit<User, 'id'>) => void;
  removeMember: (id: string) => void;
}

const MembersContext = createContext<MembersContextValue | null>(null);

export const useMembersContext = () => {
  const ctx = useContext(MembersContext);
  if (!ctx) throw new Error('useMembersContext must be used within MembersProvider');
  return ctx;
};

export const MembersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<User[]>(teamMembers);

  const getMemberColor = (id: string): string => {
    const idx = members.findIndex(m => m.id === id);
    if (idx === -1) return memberColors[0];
    return memberColors[idx % memberColors.length];
  };

  const addMember = (member: Omit<User, 'id'>) => {
    const newMember: User = { ...member, id: `u${Date.now()}` };
    setMembers(prev => [...prev, newMember]);
  };

  const removeMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  return (
    <MembersContext.Provider value={{ members, getMemberColor, addMember, removeMember }}>
      {children}
    </MembersContext.Provider>
  );
};
