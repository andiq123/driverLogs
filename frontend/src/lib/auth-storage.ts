const tokenKey = "driverlogs_token";
const loginIDKey = "driverlogs_login_id";

export function readToken() {
  if (typeof window === "undefined") return "";
  return readStorage(tokenKey);
}

export function saveToken(token: string) {
  writeStorage(tokenKey, token);
}

export function readLoginID() {
  if (typeof window === "undefined") return "";
  return readStorage(loginIDKey);
}

export function saveLoginID(loginID: string) {
  writeStorage(loginIDKey, loginID);
}

export function clearAuth() {
  removeStorage(tokenKey);
  removeStorage(loginIDKey);
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
