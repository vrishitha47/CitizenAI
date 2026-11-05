import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearToken, getToken, setToken } from "../api/client";
import { fetchMe, login as loginApi, register as registerApi } from "../api/auth";
import type { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, if we have a token, restore the session by fetching /me.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await loginApi(email, password);
    setToken(res.token);
    const u: AuthUser = {
      userId: res.userId,
      name: res.name,
      email: res.email,
      role: res.role,
    };
    setUser(u);
    return u;
  }

  async function register(name: string, email: string, password: string) {
    const res = await registerApi(name, email, password);
    setToken(res.token);
    const u: AuthUser = {
      userId: res.userId,
      name: res.name,
      email: res.email,
      role: res.role,
    };
    setUser(u);
    return u;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  function updateUser(patch: Partial<AuthUser>) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
