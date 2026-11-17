"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { User } from "../types";
import { api, clearStoredAuth, getStoredAuthToken } from "./api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Gold Vault & Banking Security: 30 minutes of inactivity auto-lock
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, user: User, rememberMe?: boolean, expiresIn?: number) => void;
  logout: (reason?: string | any) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const lastActivityRef = useRef<number>(Date.now());
  const throttleTimerRef = useRef<number>(0);

  // Globally prevent mouse wheel from incrementing or decrementing values on number inputs
  useEffect(() => {
    const handleGlobalWheel = () => {
      if (
        typeof document !== "undefined" &&
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.type === "number"
      ) {
        document.activeElement.blur();
      }
    };
    window.addEventListener("wheel", handleGlobalWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleGlobalWheel);
  }, []);

  // Central Logout Function
  const logout = useCallback(
    (reason?: any) => {
      setToken(null);
      setUser(null);
      clearStoredAuth();

      api.logout().catch(() => {});

      if (reason === "inactivity") {
        toast.warning("Logged out due to 30 minutes of inactivity for security.");
        router.push("/login?reason=inactivity");
      } else if (reason === "expired") {
        toast.info("Your session has expired. Please sign in again.");
        router.push("/login?reason=expired");
      } else if (reason === "daily_expiry") {
        toast.info("Daily security check: Please sign in for today's session.");
        router.push("/login?reason=daily_expiry");
      } else {
        router.push("/login");
      }
    },
    [router]
  );

  // Central Login Function
  const login = useCallback(
    (newToken: string, newUser: User, rememberMe: boolean = false, expiresIn?: number) => {
      setToken(newToken);
      setUser(newUser);

      const now = Date.now();
      const expiryDurationSeconds = expiresIn || (rememberMe ? 10 * 3600 : 4 * 3600);
      const expiresAt = now + expiryDurationSeconds * 1000;
      const todayDate = new Date().toDateString();

      lastActivityRef.current = now;

      if (rememberMe) {
        // Saved for today's workday only in localStorage (strictly expires at midnight)
        sessionStorage.removeItem("girvi_token");
        sessionStorage.removeItem("girvi_user");
        sessionStorage.removeItem("girvi_session_expires_at");
        sessionStorage.removeItem("girvi_last_active");
        sessionStorage.removeItem("girvi_login_date");

        localStorage.setItem("girvi_token", newToken);
        localStorage.setItem("girvi_user", JSON.stringify(newUser));
        localStorage.setItem("girvi_session_expires_at", String(expiresAt));
        localStorage.setItem("girvi_last_active", String(now));
        localStorage.setItem("girvi_login_date", todayDate);
        localStorage.setItem("girvi_remember_me", "true");
      } else {
        // Single session: stored in sessionStorage only. Closed browser = Session destroyed!
        localStorage.removeItem("girvi_token");
        localStorage.removeItem("girvi_user");
        localStorage.removeItem("girvi_session_expires_at");
        localStorage.removeItem("girvi_last_active");
        localStorage.removeItem("girvi_login_date");
        localStorage.removeItem("girvi_remember_me");

        sessionStorage.setItem("girvi_token", newToken);
        sessionStorage.setItem("girvi_user", JSON.stringify(newUser));
        sessionStorage.setItem("girvi_session_expires_at", String(expiresAt));
        sessionStorage.setItem("girvi_last_active", String(now));
        sessionStorage.setItem("girvi_login_date", todayDate);
      }
    },
    []
  );

  // Check Session Expiration & Inactivity
  const checkSessionValidity = useCallback(() => {
    if (typeof window === "undefined") return false;

    const storedToken = getStoredAuthToken();
    if (!storedToken) return false;

    const loginDate =
      sessionStorage.getItem("girvi_login_date") ||
      localStorage.getItem("girvi_login_date");
    const todayDate = new Date().toDateString();

    // 0. Strict Daily Cutoff: If login date is from yesterday or earlier, logout immediately!
    if (loginDate && loginDate !== todayDate) {
      logout("daily_expiry");
      return false;
    }

    const expiresAt = Number(
      sessionStorage.getItem("girvi_session_expires_at") ||
        localStorage.getItem("girvi_session_expires_at") ||
        0
    );

    const lastActive = Number(
      sessionStorage.getItem("girvi_last_active") ||
        localStorage.getItem("girvi_last_active") ||
        lastActivityRef.current ||
        0
    );

    const now = Date.now();

    // 1. Shift / Session expiry check
    if (expiresAt > 0 && now > expiresAt) {
      logout("expired");
      return false;
    }

    // 2. Inactivity timeout check (30 minutes)
    if (lastActive > 0 && now - lastActive > INACTIVITY_TIMEOUT_MS) {
      logout("inactivity");
      return false;
    }

    return true;
  }, [logout]);

  // Initial Authentication Check on Page Load
  useEffect(() => {
    const storedToken = getStoredAuthToken();
    const storedUserRaw =
      sessionStorage.getItem("girvi_user") || localStorage.getItem("girvi_user");

    if (storedToken && storedUserRaw) {
      // Validate expiration & inactivity before restoring session
      const isValid = checkSessionValidity();
      if (!isValid) {
        setIsLoading(false);
        return;
      }

      try {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUserRaw);
        setUser(parsedUser);

        // Verify with backend
        api
          .getMe()
          .then((res) => {
            if (res.success && res.user) {
              setUser(res.user);
              if (localStorage.getItem("girvi_token")) {
                localStorage.setItem("girvi_user", JSON.stringify(res.user));
              } else {
                sessionStorage.setItem("girvi_user", JSON.stringify(res.user));
              }
            } else {
              logout("expired");
            }
          })
          .catch(() => {
            // Token might be invalid or expired on backend
            logout("expired");
          })
          .finally(() => {
            setIsLoading(false);
          });
      } catch {
        logout("expired");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [checkSessionValidity, logout]);

  // User Activity Tracking & Periodic Inactivity Polling
  useEffect(() => {
    if (!token) return;

    // Record activity timestamp (throttled to once every 10 seconds)
    const recordActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;

      if (now - throttleTimerRef.current > 10000) {
        throttleTimerRef.current = now;
        if (localStorage.getItem("girvi_token")) {
          localStorage.setItem("girvi_last_active", String(now));
        } else if (sessionStorage.getItem("girvi_token")) {
          sessionStorage.setItem("girvi_last_active", String(now));
        }
      }
    };

    // User activity listeners
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    // Periodic check every 15 seconds to auto-logout if user walked away
    const intervalId = setInterval(() => {
      checkSessionValidity();
    }, 15000);

    // When tab becomes visible again (e.g., coming back the next day or after lunch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSessionValidity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", checkSessionValidity);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, recordActivity));
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", checkSessionValidity);
    };
  }, [token, checkSessionValidity]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === "admin",
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
