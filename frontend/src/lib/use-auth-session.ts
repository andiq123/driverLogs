"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiBaseHost, errorMessage, getSession, isUnauthorizedError, logClientError, login, onTokenRefresh, register } from "./api";
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
      if (!session.token) {
        setAuthStatus("Backend did not return a JWT.");
        setAuthFeedback("error");
        logClientError({ level: "error", area: "auth.register.token", message: "Register response did not include token" });
        return;
      }
      try {
        await getSession(session.token);
      } catch (error) {
        const detail = errorMessage(error, "unknown error");
        logClientError({ level: "error", area: "auth.register.session", message: "Registered token was rejected by session endpoint", detail, context: { token_length: session.token.length, api_host: apiBaseHost() } });
        setAuthStatus(`Login was created, but the JWT was rejected: ${detail}.`);
        setAuthFeedback("error");
        return;
      }
      if (!saveToken(session.token)) {
        setAuthStatus("Browser storage is blocked. Enable website storage and try again.");
        setAuthFeedback("error");
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
      let session;
      try {
        session = await login(cleanLoginID);
      } catch (error) {
        const detail = errorMessage(error, "unknown error");
        logClientError({ level: "error", area: "auth.login", message: "Login request failed", detail, context: { login_length: cleanLoginID.length, login_tail: cleanLoginID.slice(-4), api_host: apiBaseHost() } });
        setAuthStatus(`Incorrect login ID: ${maskLoginID(cleanLoginID)}.`);
        setAuthFeedback("error");
        return;
      }
      if (!session.token) {
        setAuthStatus("Backend accepted the login ID but did not return a JWT.");
        setAuthFeedback("error");
        logClientError({ level: "error", area: "auth.login.token", message: "Login response did not include token", context: { login_length: cleanLoginID.length, login_tail: cleanLoginID.slice(-4), api_host: apiBaseHost() } });
        return;
      }
      try {
        await getSession(session.token);
      } catch (error) {
        const detail = errorMessage(error, "unknown error");
        logClientError({ level: "error", area: "auth.login.session", message: "Logged-in token was rejected by session endpoint", detail, context: { token_length: session.token.length, login_length: cleanLoginID.length, login_tail: cleanLoginID.slice(-4), api_host: apiBaseHost() } });
        setAuthStatus(`Login ID is valid, but the JWT was rejected: ${detail}.`);
        setAuthFeedback("error");
        return;
      }
      if (!saveToken(session.token)) {
        setAuthStatus("Browser storage is blocked. Enable website storage and try again.");
        setAuthFeedback("error");
        logClientError({ level: "error", area: "auth.login.storage", message: "Token was not persisted after login", context: { login_length: cleanLoginID.length } });
        return;
      }
      saveLoginID(cleanLoginID);
      setToken(session.token);
      setLoginID(cleanLoginID);
      setAuthStatus("");
      setAuthFeedback("idle");
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
  return Array.from(value.normalize("NFKC"))
    .map((char) => {
      if (char >= "0" && char <= "9") return char;
      const code = char.charCodeAt(0);
      if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
      if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
      return "";
    })
    .join("");
}

function maskLoginID(value: string) {
  if (value.length <= 4) return value;
  return `${value.slice(0, 3)}...${value.slice(-4)}`;
}
