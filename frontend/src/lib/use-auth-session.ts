"use client";

import { useCallback, useEffect, useState } from "react";
import { getSession, isUnauthorizedError, login, onTokenRefresh, register } from "./api";
import { clearAuth, readLoginID, readToken, saveLoginID, saveToken } from "./auth-storage";
import type { LoginNotice } from "./types";

export function useAuthSession() {
  const [token, setToken] = useState("");
  const [loginID, setLoginID] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [authFeedback, setAuthFeedback] = useState<"idle" | "error" | "success" | "loading">("idle");
  const [authAction, setAuthAction] = useState<"login" | "register" | "">("");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loginNotice, setLoginNotice] = useState<LoginNotice>({ loginID: "", isOpen: false });

  useEffect(() => {
    onTokenRefresh((nextToken) => {
      saveToken(nextToken);
      setToken(nextToken);
    });
    const frame = requestAnimationFrame(() => {
      const savedToken = readToken();
      setLoginID(readLoginID());
      setIsAuthReady(true);
      if (!savedToken) return;
      setToken(savedToken);
      void getSession(savedToken).catch((error) => {
        if (isUnauthorizedError(error)) {
          clearAuth();
          setToken("");
        }
      });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const createLogin = useCallback(async () => {
    setAuthAction("register");
    setAuthFeedback("loading");
    setAuthStatus("Creating login...");
    try {
      const session = await register();
      saveToken(session.token);
      setToken(session.token);
      if (session.login_id) {
        saveLoginID(session.login_id);
        setLoginID(session.login_id);
        setLoginNotice({ loginID: session.login_id, isOpen: true, needsName: true });
      }
      setAuthStatus("Login created.");
      setAuthFeedback("success");
    } catch {
      setAuthStatus("Could not create login. Please try again.");
      setAuthFeedback("error");
    } finally {
      setAuthAction("");
    }
  }, []);

  const signIn = useCallback(async (nextLoginID: string) => {
    const cleanLoginID = cleanNumericLoginID(nextLoginID);
    if (!cleanLoginID) {
      setAuthStatus("Enter your login ID.");
      setAuthFeedback("error");
      return;
    }
    setAuthAction("login");
    setAuthFeedback("loading");
    setAuthStatus("Signing in...");
    try {
      const session = await login(cleanLoginID);
      saveToken(session.token);
      saveLoginID(cleanLoginID);
      setToken(session.token);
      setLoginID(cleanLoginID);
      setAuthStatus("");
      setAuthFeedback("idle");
    } catch {
      setAuthStatus("Incorrect login ID.");
      setAuthFeedback("error");
    } finally {
      setAuthAction("");
    }
  }, []);

  const clearAuthStatus = useCallback(() => {
    setAuthStatus("");
    setAuthFeedback("idle");
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setToken("");
    setLoginID("");
    setAuthStatus("");
    setLoginNotice({ loginID: "", isOpen: false });
  }, []);

  const closeLoginNotice = useCallback(() => {
    setLoginNotice((notice) => ({ ...notice, isOpen: false }));
  }, []);

  return {
    authStatus,
    closeLoginNotice,
    createLogin,
    isAuthReady,
    loginID,
    loginNotice,
    logout,
    setAuthStatus,
    clearAuthStatus,
    signIn,
    authAction,
    authFeedback,
    token,
  };
}

function cleanNumericLoginID(value: string) {
  return value.replace(/\D/g, "");
}
