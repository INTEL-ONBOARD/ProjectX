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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const electronAPI = (window as any).electronAPI;
    let cancelled = false;
    const subs: { unsub?: () => void; unsubReconnect?: () => void } = {};

    // Step 1: fetch initial data first, THEN subscribe to change stream.
    // This eliminates the race condition where the initial fetch overwrites change stream inserts.
    api().getMembers()
      .then((docs: User[]) => {
        if (cancelled) return;
        setMembers(docs as User[]);

        // Step 2: wire up change stream only AFTER initial data is in state
        if (!electronAPI) return;
        subs.unsub = electronAPI.onMemberChanged?.((_: unknown, payload: { op: string; doc?: User; id?: string }) => {
          const { op, doc } = payload;
          if (op === 'insert') {
            setMembers(prev => prev.some(m => m.id === doc!.id) ? prev : [...prev, doc!]);
          } else if (op === 'update' || op === 'replace') {
            setMembers(prev => {
              const exists = prev.some(m => m.id === doc!.id);
              return exists ? prev.map(m => m.id === doc!.id ? doc! : m) : [...prev, doc!];
            });
          } else if (op === 'delete') {
            api().getMembers().then((fresh: User[]) => setMembers(fresh)).catch(() => {});
          }
        });
      })
      .catch((err: unknown) => console.error('[MembersContext] Failed to load members:', err));

    subs.unsubReconnect = electronAPI?.onDbReconnected?.(() => {
      api().getMembers().then((docs: User[]) => setMembers(docs)).catch(() => {});
    });

    return () => {
      cancelled = true;
      subs.unsub?.();
      subs.unsubReconnect?.();
    };
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
