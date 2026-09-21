import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as authApi from '@/api/auth';
import type { AuthSession, SignupPayload, User } from '@/api/types';
import { STORAGE_KEYS } from '@/lib/config';
import { setUnauthorizedHandler, tokenExpiry, tokenStore } from '@/lib/session';
import { readJson, readString, remove, writeJson, writeString } from '@/lib/storage';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Set when a protected request came back 401/403. The login page shows a notice. */
  sessionExpired: boolean;
  /** When this browser session signed in (ISO). */
  loginAt: string | null;
  /** True after "Do this later" on onboarding; lets the user into the app before setup is complete. */
  setupSkipped: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  register: (payload: SignupPayload) => Promise<User>;
  signOut: () => void;
  /** No /api/me endpoint exists, so bankConnected is tracked locally once the OAuth callback confirms it. */
  setBankConnected: (connected: boolean) => void;
  skipSetup: () => void;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadInitial(): { token: string | null; user: User | null } {
  const token = tokenStore.get();
  const user = readJson<User>(STORAGE_KEYS.user);
  if (!token || !user || !user.id) {
    tokenStore.clear();
    remove(STORAGE_KEYS.user);
    return { token: null, user: null };
  }
  const exp = tokenExpiry(token);
  if (exp !== null && exp <= Date.now()) {
    tokenStore.clear();
    remove(STORAGE_KEYS.user);
    return { token: null, user: null };
  }
  return { token, user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [{ token, user }, setAuth] = useState(loadInitial);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loginAt, setLoginAt] = useState<string | null>(() => readString(STORAGE_KEYS.loginAt));
  const [setupSkipped, setSetupSkipped] = useState(() => readString(STORAGE_KEYS.setupSkipped, 'session') === '1');

  const clearSession = useCallback(() => {
    tokenStore.clear();
    remove(STORAGE_KEYS.user);
    remove(STORAGE_KEYS.loginAt);
    remove(STORAGE_KEYS.setupSkipped, 'session');
    setAuth({ token: null, user: null });
    setLoginAt(null);
    setSetupSkipped(false);
    queryClient.clear();
  }, [queryClient]);

  // 401 anywhere: clear the token and let the route guard send the user to /login. No refresh endpoint exists.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!tokenStore.get()) return;
      clearSession();
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const applySession = useCallback(
    (session: AuthSession): User => {
      // The login response can be stale after an OAuth round-trip, so remember a confirmed connection locally.
      const remembered = readString(STORAGE_KEYS.bankConnected(session.user.id)) === '1';
      const next: User = { ...session.user, bankConnected: session.user.bankConnected || remembered };
      const now = new Date().toISOString();
      tokenStore.set(session.token);
      writeJson(STORAGE_KEYS.user, next);
      writeString(STORAGE_KEYS.loginAt, now);
      remove(STORAGE_KEYS.setupSkipped, 'session');
      queryClient.clear();
      setAuth({ token: session.token, user: next });
      setLoginAt(now);
      setSetupSkipped(false);
      setSessionExpired(false);
      return next;
    },
    [queryClient],
  );

  const signIn = useCallback(async (email: string, password: string) => applySession(await authApi.login({ email, password })), [applySession]);
  const register = useCallback(async (payload: SignupPayload) => applySession(await authApi.signup(payload)), [applySession]);

  const setBankConnected = useCallback((connected: boolean) => {
    setAuth((prev) => {
      if (!prev.user || prev.user.bankConnected === connected) return prev;
      const next = { ...prev.user, bankConnected: connected };
      writeJson(STORAGE_KEYS.user, next);
      if (connected) writeString(STORAGE_KEYS.bankConnected(next.id), '1');
      return { ...prev, user: next };
    });
  }, []);

  const skipSetup = useCallback(() => {
    writeString(STORAGE_KEYS.setupSkipped, '1', 'session');
    setSetupSkipped(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      sessionExpired,
      loginAt,
      setupSkipped,
      signIn,
      register,
      signOut: clearSession,
      setBankConnected,
      skipSetup,
      clearSessionExpired: () => setSessionExpired(false),
    }),
    [user, token, sessionExpired, loginAt, setupSkipped, signIn, register, clearSession, setBankConnected, skipSetup],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For code that only runs when signed in (inside the route guard). */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useUser called without a signed-in user');
  return user;
}
