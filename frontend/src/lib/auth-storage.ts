const tokenKey = "driverlogs_token";
const loginIDKey = "driverlogs_login_id";
const cookieMaxAge = 31 * 24 * 60 * 60;

export function readToken() {
  if (typeof window === "undefined") return "";
  return readStorage(tokenKey) || readCookie(tokenKey);
}

export function saveToken(token: string) {
  writeStorage(tokenKey, token);
  writeCookie(tokenKey, token);
}

export function readLoginID() {
  if (typeof window === "undefined") return "";
  return readStorage(loginIDKey) || readCookie(loginIDKey);
}

export function saveLoginID(loginID: string) {
  writeStorage(loginIDKey, loginID);
  writeCookie(loginIDKey, loginID);
}

export function clearAuth() {
  removeStorage(tokenKey);
  removeStorage(loginIDKey);
  removeCookie(tokenKey);
  removeCookie(loginIDKey);
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // iOS can deny storage in constrained web views; keep the in-memory session active.
  }
}

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

function readCookie(key: string) {
  const prefix = `${encodeURIComponent(key)}=`;
  const value = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : "";
}

function writeCookie(key: string, value: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; Max-Age=${cookieMaxAge}; Path=/; SameSite=Lax${secure}`;
}

function removeCookie(key: string) {
  document.cookie = `${encodeURIComponent(key)}=; Max-Age=0; Path=/; SameSite=Lax`;
}
