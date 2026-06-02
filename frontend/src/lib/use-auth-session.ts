"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, getSession, isUnauthorizedError, logClientError, login, onTokenRefresh, register } from "./api";
import { emitAuthDebug } from "./auth-debug";
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

  const restoreSession = useCallback(async () => {
    const runID = authRunRef.current;
    const savedLoginID = readLoginID();
    const savedToken = readToken();
    setLoginID(savedLoginID);
    if (!savedToken) {
      emitAuthDebug({ title: "Auth restore", body: "No saved JWT found.", kind: "info" });
      if (authRunRef.current === runID) setIsAuthReady(true);
      return;
    }
    setToken(savedToken);
    try {
      await getSession(savedToken);
      emitAuthDebug({ title: "Auth restored", body: "Saved JWT accepted.", kind: "success" });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        logClientError({ level: "warn", area: "auth.restore.token", message: "Stored token was rejected", detail: errorMessage(error, "unauthorized"), context: { had_saved_token: true } });
        if (authRunRef.current !== runID) return;
        clearAuth();
        setToken("");
        emitAuthDebug({ title: "Auth cleared", body: "Saved JWT was rejected.", kind: "error" });
      } else {
        logClientError({ level: "warn", area: "auth.restore.token", message: "Stored token check failed", detail: errorMessage(error, "unknown error"), context: { had_saved_token: true } });
      }
    } finally {
      if (authRunRef.current === runID) setIsAuthReady(true);
    }
  }, []);

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
      await getSession(session.token);
      if (!saveToken(session.token)) {
        setAuthStatus("Browser storage is blocked. Enable website storage and try again.");
        setAuthFeedback("error");
        emitAuthDebug({ title: "Register blocked", body: "JWT could not be saved to localStorage.", kind: "error" });
        logClientError({ level: "error", area: "auth.register.storage", message: "Token was not persisted after register" });
        return;
      }
      setToken(session.token);
      if (session.login_id) {
        saveLoginID(session.login_id);
        setLoginID(session.login_id);
        setLoginNotice({ loginID: session.login_id, isOpen: true, needsName: true });
      }
      setAuthStatus("Login created.");
      setAuthFeedback("success");
      emitAuthDebug({ title: "Register success", body: "JWT saved. Opening app.", kind: "success" });
    } catch (error) {
      logClientError({ level: "error", area: "auth.register", message: "Register request failed", detail: errorMessage(error, "unknown error") });
      setAuthStatus("Could not create login. Please try again.");
      setAuthFeedback("error");
      emitAuthDebug({ title: "Register failed", body: errorMessage(error, "Request failed."), kind: "error" });
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
      await getSession(session.token);
      if (!saveToken(session.token)) {
        setAuthStatus("Browser storage is blocked. Enable website storage and try again.");
        setAuthFeedback("error");
        emitAuthDebug({ title: "Login blocked", body: "JWT could not be saved to localStorage.", kind: "error" });
        logClientError({ level: "error", area: "auth.login.storage", message: "Token was not persisted after login", context: { login_length: cleanLoginID.length } });
        return;
      }
      saveLoginID(cleanLoginID);
      setToken(session.token);
      setLoginID(cleanLoginID);
      setAuthStatus("");
      setAuthFeedback("idle");
      emitAuthDebug({ title: "Login success", body: "JWT saved. Loading dashboard.", kind: "success" });
    } catch (error) {
      logClientError({ level: "error", area: "auth.login", message: "Login request failed", detail: errorMessage(error, "unknown error"), context: { login_length: cleanLoginID.length } });
      setAuthStatus("Incorrect login ID.");
      setAuthFeedback("error");
      emitAuthDebug({ title: "Login failed", body: errorMessage(error, "Request failed."), kind: "error" });
    } finally {
      setAuthAction("");
    }
  }, []);

  const clearAuthStatus = useCallback(() => {
    setAuthStatus("");
    setAuthFeedback("idle");
  }, []);

  const logout = useCallback((message = "") => {
    authRunRef.current += 1;
    clearAuth();
    setToken("");
    setLoginID("");
    setIsAuthReady(true);
    setAuthStatus(message);
    setAuthFeedback(message ? "error" : "idle");
    setAuthAction("");
    setLoginNotice({ loginID: "", isOpen: false });
    emitAuthDebug({ title: message ? "Redirected to login" : "Logged out", body: message || "JWT cleared from localStorage.", kind: message ? "error" : "info" });
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
