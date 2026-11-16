"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "../types";
import { api } from "./api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
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

  useEffect(() => {
    const storedToken = localStorage.getItem("girvi_token");
    const storedUser = localStorage.getItem("girvi_user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify with backend
        api
          .getMe()
          .then((res) => {
            if (res.success && res.user) {
              setUser(res.user);
              localStorage.setItem("girvi_user", JSON.stringify(res.user));
            }
          })
          .catch(() => {
            // Token might be invalid or backend offline, don't clear prematurely
          })
          .finally(() => {
            setIsLoading(false);
          });
      } catch {
        localStorage.removeItem("girvi_token");
        localStorage.removeItem("girvi_user");
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("girvi_token", newToken);
    localStorage.setItem("girvi_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("girvi_token");
    localStorage.removeItem("girvi_user");
    api.logout().catch(() => {});
    router.push("/login");
  };

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
