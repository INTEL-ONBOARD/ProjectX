import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const KEYS = {
  user: 'pm_auth_user',
  walkthrough: 'pm_has_seen_walkthrough',
  users: 'pm_users',
} as const;

interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'member';
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasSeenWalkthrough: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'admin' | 'manager' | 'member') => Promise<void>;
  logout: () => void;
  markWalkthroughSeen: () => void;
}

export const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export const useAuth = () => useContext(AuthContext);

function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(KEYS.users);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function seedDefaultUser() {
  const users = getStoredUsers();
  if (!users.find(u => u.email === 'admin@projectm.com')) {
    users.push({
      id: 'user-default',
      name: 'Admin User',
      email: 'admin@projectm.com',
      password: 'password123',
      role: 'admin',
    });
    localStorage.setItem(KEYS.users, JSON.stringify(users));
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(false);

  useEffect(() => {
    seedDefaultUser();
    setHasSeenWalkthrough(localStorage.getItem(KEYS.walkthrough) === 'true');

    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(KEYS.user);
        if (raw) setUser(JSON.parse(raw));
      } catch { /* ignore */ }
      setIsLoading(false);
    }, 2500); // splash duration

    return () => clearTimeout(timer);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await new Promise(r => setTimeout(r, 600)); // simulate network
    const users = getStoredUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) throw new Error('Invalid email or password.');
    const authUser: AuthUser = { id: found.id, name: found.name, email: found.email, role: found.role };
    localStorage.setItem(KEYS.user, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: 'admin' | 'manager' | 'member'
  ) => {
    await new Promise(r => setTimeout(r, 600));
    const users = getStoredUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }
    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      password,
      role,
    };
    users.push(newUser);
    localStorage.setItem(KEYS.users, JSON.stringify(users));
    const authUser: AuthUser = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role };
    localStorage.setItem(KEYS.user, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEYS.user);
    setUser(null);
  }, []);

  const markWalkthroughSeen = useCallback(() => {
    localStorage.setItem(KEYS.walkthrough, 'true');
    setHasSeenWalkthrough(true);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      hasSeenWalkthrough,
      login,
      register,
      logout,
      markWalkthroughSeen,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
