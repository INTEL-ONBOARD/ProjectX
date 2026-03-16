import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = () => window as any;
const prefsApi = () => win().electronAPI.userPrefs as {
  get: (userId: string) => Promise<{ hasSeenWalkthrough?: boolean } | null>;
  set: (prefs: { userId: string; hasSeenWalkthrough?: boolean }) => Promise<void>;
};
const authApi = () => win().electronAPI.auth as {
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string, role: string, orgId?: string) => Promise<AuthUser>;
  updatePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<boolean>;
  updateName: (userId: string, newName: string) => Promise<void>;
  seedDefault: () => Promise<void>;
  validate: (userId: string) => Promise<AuthUser | null>;
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
  register: (name: string, email: string, password: string, role: string, orgId?: string) => Promise<void>;
  logout: () => void;
  markWalkthroughSeen: () => void;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateDisplayName: (name: string) => void;
}

export const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(false);

  useEffect(() => {
    // Restore session synchronously from localStorage so the app shows immediately
    let restoredUser: AuthUser | null = null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) restoredUser = JSON.parse(raw) as AuthUser;
    } catch { /* ignore */ }

    // Restore walkthrough flag synchronously
    const walkthroughSeen = localStorage.getItem('pm_walkthrough_seen') === 'true';

    if (restoredUser) {
      // Validate cached session against DB — auto-clear if user no longer exists (e.g. DB was wiped)
      authApi().validate(restoredUser.id)
        .then(valid => {
          if (valid) {
            // User still exists — update local cache with latest data from DB
            const fresh = { ...restoredUser, name: valid.name, role: valid.role };
            localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
            setUser(fresh);
          } else {
            // User deleted from DB — clear stale session so they can register/login fresh
            localStorage.removeItem(SESSION_KEY);
            setUser(null);
          }
        })
        .catch(() => {
          // DB unreachable — trust local cache optimistically
          setUser(restoredUser);
        })
        .finally(() => {
          setIsLoading(false);
          authApi().seedDefault().catch(() => {});
          if (!walkthroughSeen) {
            prefsApi().get(restoredUser.id)
              .then(prefs => { if (prefs?.hasSeenWalkthrough) setHasSeenWalkthrough(true); })
              .catch(() => {});
          }
        });
      setHasSeenWalkthrough(walkthroughSeen);
      // Keep isLoading true until validate resolves
    } else {
      // New user — show splash for 2500ms then seed
      setHasSeenWalkthrough(walkthroughSeen);
      const timer = setTimeout(async () => {
        try { await authApi().seedDefault(); } catch { /* ignore */ }
        setIsLoading(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
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
    role: string,
    orgId?: string
  ) => {
    const authUser = await authApi().register(name, email, password, role, orgId);
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

  const updateDisplayName = useCallback((name: string) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, name };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
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
      updatePassword,
      updateDisplayName,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
