import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem("token")) return setUser(false);
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => {
      localStorage.removeItem("token");
      setUser(false);
    });
  }, []);

  const signIn = ({ token, user }) => {
    localStorage.setItem("token", token);
    setUser(user);
  };
  const signOut = () => {
    localStorage.removeItem("token");
    setUser(false);
  };

  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
