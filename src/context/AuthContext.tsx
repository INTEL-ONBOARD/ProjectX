import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = () => window as any;
const prefsApi = () => win().electronAPI.userPrefs as {
  get: (userId: string) => Promise<{ hasSeenWalkthrough?: boolean } | null>;
  set: (prefs: { userId: string; hasSeenWalkthrough?: boolean }) => Promise<void>;
};
const authApi = () => win().electronAPI.auth as {
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string, role: string) => Promise<AuthUser>;
  updatePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<boolean>;
  updateName: (userId: string, newName: string) => Promise<void>;
  seedDefault: () => Promise<void>;
};

// Session token only — no credential storage
const SESSION_KEY = 'pm_auth_session';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasSeenWalkthrough: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  markWalkthroughSeen: () => void;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Seed default admin account in MongoDB
      try {
        await authApi().seedDefault();
      } catch { /* ignore seed errors */ }

      // Restore session from localStorage token
      let restoredUser: AuthUser | null = null;
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          restoredUser = JSON.parse(raw) as AuthUser;
          setUser(restoredUser);
        }
      } catch { /* ignore */ }

      // Load walkthrough flag — localStorage first (works even pre-login), then DB
      if (localStorage.getItem('pm_walkthrough_seen') === 'true') {
        setHasSeenWalkthrough(true);
      } else if (restoredUser) {
        try {
          const prefs = await prefsApi().get(restoredUser.id);
          if (prefs?.hasSeenWalkthrough) setHasSeenWalkthrough(true);
        } catch {
          setHasSeenWalkthrough(false);
        }
      }
    };

    // Keep splash duration — resolve after 2500ms minimum
    const timer = setTimeout(async () => {
      await init();
      setIsLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const authUser = await authApi().login(email, password);
    localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: string
  ) => {
    const authUser = await authApi().register(name, email, password, role);
    localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const markWalkthroughSeen = useCallback(() => {
    setHasSeenWalkthrough(true);
    localStorage.setItem('pm_walkthrough_seen', 'true');
    if (user) {
      prefsApi().set({ userId: user.id, hasSeenWalkthrough: true })
        .catch((err: unknown) => console.error('[AuthContext] Failed to save walkthrough flag:', err));
    }
  }, [user]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Not authenticated.');
    await authApi().updatePassword(user.id, currentPassword, newPassword);
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
