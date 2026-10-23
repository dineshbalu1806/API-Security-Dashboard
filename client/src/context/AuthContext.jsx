import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("sentinel_user") || "null"));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("sentinel_token")));

  useEffect(() => {
    if (!localStorage.getItem("sentinel_token")) return;
    api.get("/auth/me").then(({ data }) => setUser(data.user)).catch(() => signOut()).finally(() => setLoading(false));
  }, []);

  const signIn = async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    localStorage.setItem("sentinel_token", data.token);
    localStorage.setItem("sentinel_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const signUp = async (account) => {
    const { data } = await api.post("/auth/signup", account);
    localStorage.setItem("sentinel_token", data.token);
    localStorage.setItem("sentinel_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const signOut = () => {
    localStorage.removeItem("sentinel_token");
    localStorage.removeItem("sentinel_user");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);