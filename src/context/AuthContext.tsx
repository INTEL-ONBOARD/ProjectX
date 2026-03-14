import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// ── IPC bridge detection ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = () => window as any;
const isMock = typeof window === 'undefined' || !win().electronAPI?.auth;
const authApi = () => win().electronAPI.auth as {
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string, role: 'admin' | 'manager' | 'member') => Promise<AuthUser>;
  updatePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<boolean>;
  seedDefault: () => Promise<void>;
};

// ── localStorage keys (session only — no credential storage in mock) ─────────

const SESSION_KEY = 'pm_auth_session';
const WALKTHROUGH_KEY = 'pm_has_seen_walkthrough';

// ── Mock-mode local credential store (dev/browser only) ─────────────────────

const MOCK_USERS_KEY = 'pm_mock_users';
interface MockUser { id: string; name: string; email: string; password: string; role: 'admin' | 'manager' | 'member' }
function getMockUsers(): MockUser[] {
  try { const r = localStorage.getItem(MOCK_USERS_KEY); if (r) return JSON.parse(r); } catch { /* ignore */ }
  return [];
}
function saveMockUsers(users: MockUser[]) {
  try { localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users)); } catch { /* ignore */ }
}
function seedMockDefault() {
  const users = getMockUsers();
  if (!users.find(u => u.email === 'admin@projectm.com')) {
    users.push({ id: 'auth-default', name: 'Admin User', email: 'admin@projectm.com', password: 'password123', role: 'admin' });
    saveMockUsers(users);
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

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
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
export const useAuth = () => useContext(AuthContext);

// ── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(false);

  useEffect(() => {
    setHasSeenWalkthrough(localStorage.getItem(WALKTHROUGH_KEY) === 'true');

    // Seed default account then restore session
    const init = async () => {
      try {
        if (isMock) {
          seedMockDefault();
        } else {
          await authApi().seedDefault();
        }
      } catch { /* ignore seed errors */ }

      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch { /* ignore */ }
    };

    // Keep splash duration — resolve after 2500ms minimum
    const timer = setTimeout(async () => {
      await init();
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    let authUser: AuthUser;
    if (isMock) {
      const users = getMockUsers();
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!found) throw new Error('Invalid email or password.');
      authUser = { id: found.id, name: found.name, email: found.email, role: found.role };
    } else {
      authUser = await authApi().login(email, password);
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: 'admin' | 'manager' | 'member'
  ) => {
    let authUser: AuthUser;
    if (isMock) {
      const users = getMockUsers();
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists.');
      }
      const newUser: MockUser = { id: `auth-${Date.now()}`, name, email: email.toLowerCase(), password, role };
      users.push(newUser);
      saveMockUsers(users);
      authUser = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role };
    } else {
      authUser = await authApi().register(name, email, password, role);
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const markWalkthroughSeen = useCallback(() => {
    localStorage.setItem(WALKTHROUGH_KEY, 'true');
    setHasSeenWalkthrough(true);
  }, []);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Not authenticated.');
    if (isMock) {
      const users = getMockUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx === -1 || users[idx].password !== currentPassword) throw new Error('Current password is incorrect.');
      users[idx].password = newPassword;
      saveMockUsers(users);
    } else {
      await authApi().updatePassword(user.id, currentPassword, newPassword);
    }
  }, [user]);

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
      updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
