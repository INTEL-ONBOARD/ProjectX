import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = () => window as any;
const appApi = () => win().electronAPI.app as { setActiveUser: (userId: string) => Promise<void> };
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
  connectionWarning: boolean;
  hasSeenWalkthrough: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
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
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [hasSeenWalkthrough, setHasSeenWalkthrough] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);

    if (savedSession) {
      // User previously checked "Keep me signed in" — validate against DB
      let restoredUser: AuthUser | null = null;
      try { restoredUser = JSON.parse(savedSession) as AuthUser; } catch { /* ignore */ }

      if (restoredUser) {
        const tryValidate = (attempt: number, maxAttempts: number) => {
          authApi().validate(restoredUser!.id)
            .then(valid => {
              if (valid) {
                const fresh = { ...restoredUser!, name: valid.name, role: valid.role };
                localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
                setUser(fresh);
                appApi().setActiveUser(fresh.id).catch(() => {});
                prefsApi().get(fresh.id)
                  .then(prefs => { if (prefs?.hasSeenWalkthrough) setHasSeenWalkthrough(true); })
                  .catch(() => {});
              } else {
                // User no longer exists in DB — clear stale session
                localStorage.removeItem(SESSION_KEY);
                setUser(null);
              }
              authApi().seedDefault().catch(() => {});
              setIsLoading(false);
            })
            .catch(() => {
              if (attempt < maxAttempts) {
                // DB not ready yet — retry with exponential backoff, user stays on splash screen
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
                setTimeout(() => tryValidate(attempt + 1, maxAttempts), delay);
              } else {
                // All retries exhausted — keep stale session, show connection warning
                setUser(restoredUser);
                setConnectionWarning(true);
                authApi().seedDefault().catch(() => {});
                setIsLoading(false);
              }
            });
        };
        tryValidate(1, 4); // attempts 1-4: delays 1000, 2000, 4000, 8000ms
        return;
      }
    }

    // No saved session — show splash then go to login
    const timer = setTimeout(async () => {
      try { await authApi().seedDefault(); } catch { /* ignore */ }
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const login = useCallback(async (email: string, password: string, remember = false) => {
    const authUser = await authApi().login(email, password);
    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
    }
    try {
      const prefs = await prefsApi().get(authUser.id);
      if (prefs?.hasSeenWalkthrough) setHasSeenWalkthrough(true);
    } catch { /* ignore */ }
    setUser(authUser);
    appApi().setActiveUser(authUser.id).catch(() => {});
  }, []);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    role: string,
    orgId?: string
  ) => {
    await authApi().register(name, email, password, role, orgId);
    setHasSeenWalkthrough(false);
    // Do NOT setUser — new accounts are guest and require admin approval before accessing the app
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setHasSeenWalkthrough(false);
    setUser(null);
    appApi().setActiveUser('').catch(() => {});
  }, []);

  const markWalkthroughSeen = useCallback(() => {
    setHasSeenWalkthrough(true);
    if (user) {
      prefsApi().set({ userId: user.id, hasSeenWalkthrough: true })
        .catch((err: unknown) => console.error('[AuthContext] Failed to save walkthrough flag:', err));
    }
  }, [user]);

  const updatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Not authenticated.');
    if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters');
    if (newPassword === currentPassword) throw new Error('New password must differ from current password');
    await authApi().updatePassword(user.id, currentPassword, newPassword);
  }, [user]);

  const updateDisplayName = useCallback((name: string) => {
    if (!name.trim()) throw new Error('Name cannot be empty');
    if (name.trim().length > 80) throw new Error('Name is too long');
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, name };
      // Keep saved session in sync if user had chosen "keep me signed in"
      if (localStorage.getItem(SESSION_KEY)) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      connectionWarning,
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
