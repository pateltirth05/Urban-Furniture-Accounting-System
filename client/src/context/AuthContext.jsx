import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("uf_user");

    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem("uf_user");
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("uf_token");

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("uf_user", JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem("uf_token");
        localStorage.removeItem("uf_user");
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function login(loginId, password) {
    const { data } = await api.post("/auth/login", {
      loginId,
      password,
    });

    localStorage.setItem("uf_token", data.token);
    localStorage.setItem("uf_user", JSON.stringify(data.user));

    setUser(data.user);

    return data.user;
  }

  async function register(formData) {
    const { data } = await api.post("/auth/register", formData);

    /*
     * Backend returns:
     * {
     *   user: {...}
     * }
     */
    return data.user;
  }

  function logout() {
    localStorage.removeItem("uf_token");
    localStorage.removeItem("uf_user");
    setUser(null);
  }

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}