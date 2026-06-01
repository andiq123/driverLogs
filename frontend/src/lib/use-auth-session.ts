"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, getSession, isUnauthorizedError, logClientError, login, onTokenRefresh, register } from "./api";
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
  const authRunRef = useRef(0);

  const restoreCookieSession = useCallback(async (runID: number) => {
    try {
      await getSession();
      if (authRunRef.current !== runID) return;
      setLoginID(readLoginID());
    } catch (error) {
      logClientError({ level: "warn", area: "auth.restore.cookie", message: "Cookie session restore failed", detail: errorMessage(error, "unknown error") });
      if (authRunRef.current !== runID) return;
      setToken("");
    }
  }, []);

  const restoreSession = useCallback(async () => {
    const runID = authRunRef.current;
    const savedLoginID = readLoginID();
    const savedToken = readToken();
    setLoginID(savedLoginID);
    if (!savedToken) {
      await restoreCookieSession(runID);
      if (authRunRef.current === runID) setIsAuthReady(true);
      return;
    }
    setToken(savedToken);
    try {
      await getSession(savedToken);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        logClientError({ level: "warn", area: "auth.restore.token", message: "Stored token was rejected", detail: errorMessage(error, "unauthorized"), context: { had_saved_token: true } });
        if (authRunRef.current !== runID) return;
        clearAuth();
        setToken("");
        await restoreCookieSession(runID);
      } else {
        logClientError({ level: "warn", area: "auth.restore.token", message: "Stored token check failed", detail: errorMessage(error, "unknown error"), context: { had_saved_token: true } });
      }
    } finally {
      if (authRunRef.current === runID) setIsAuthReady(true);
    }
  }, [restoreCookieSession]);

  useEffect(() => {
    onTokenRefresh((nextToken) => {
      saveToken(nextToken);
      setToken(nextToken);
    });
    const frame = requestAnimationFrame(() => {
      void restoreSession();
    });
    return () => cancelAnimationFrame(frame);
  }, [restoreSession]);

  const createLogin = useCallback(async () => {
    authRunRef.current += 1;
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
    } catch (error) {
      logClientError({ level: "error", area: "auth.register", message: "Register request failed", detail: errorMessage(error, "unknown error") });
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
    authRunRef.current += 1;
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
    } catch (error) {
      logClientError({ level: "error", area: "auth.login", message: "Login request failed", detail: errorMessage(error, "unknown error"), context: { login_length: cleanLoginID.length } });
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
    authRunRef.current += 1;
    clearAuth();
    setToken("");
    setLoginID("");
    setIsAuthReady(true);
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
