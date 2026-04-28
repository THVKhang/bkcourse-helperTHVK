"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const TOKEN_KEY = "bkcourse_token";
const USER_KEY = "bkcourse_user_info";

interface UserInfo {
  username: string;
  email?: string | null;
  studentCode: string;
  isGuest: boolean;
}

interface UserState {
  token: string | null;
  user: UserInfo | null;
  termCode: string;
  programId: number | null;
  completedSemesters: number;
  // Convenience accessors
  studentCode: string;
  isLoggedIn: boolean;
  isGuest: boolean;
  // Setters
  setTermCode: (v: string) => void;
  setProgramId: (v: number | null) => void;
  setCompletedSemesters: (v: number) => void;
  setStudentCode: (v: string) => void;
  // Auth actions
  loginWith: (token: string, user: UserInfo) => void;
  logout: () => void;
}

const UserContext = createContext<UserState | null>(null);

function loadToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function loadUser(): UserInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [termCode, setTermCode] = useState("252");
  const [programId, setProgramId] = useState<number | null>(null);
  const [completedSemesters, setCompletedSemesters] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = loadToken();
    const u = loadUser();
    if (t) setToken(t);
    if (u) setUser(u);

    // Also load term/program from localStorage
    try {
      const saved = localStorage.getItem("bkcourse_settings");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.termCode) setTermCode(s.termCode);
        if (s.programId) setProgramId(s.programId);
        if (s.completedSemesters) setCompletedSemesters(s.completedSemesters);
      }
    } catch {}
    setLoaded(true);
  }, []);

  // Persist settings
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("bkcourse_settings", JSON.stringify({ termCode, programId, completedSemesters }));
  }, [termCode, programId, completedSemesters, loaded]);

  const loginWith = useCallback((newToken: string, newUser: UserInfo) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("bkcourse_last_import");
  }, []);

  const studentCode = user?.studentCode || user?.username || "";
  const setStudentCode = useCallback((_v: string) => {
    // studentCode is now derived from auth, this is a no-op kept for compatibility
  }, []);

  return (
    <UserContext.Provider
      value={{
        token, user, termCode, programId, completedSemesters,
        studentCode,
        isLoggedIn: !!token,
        isGuest: user?.isGuest ?? false,
        setTermCode, setProgramId, setCompletedSemesters, setStudentCode,
        loginWith, logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
