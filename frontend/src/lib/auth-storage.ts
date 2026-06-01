const tokenKey = "driverlogs_token";
const loginIDKey = "driverlogs_login_id";

export function readToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(tokenKey) ?? "";
}

export function saveToken(token: string) {
  window.localStorage.setItem(tokenKey, token);
}

export function readLoginID() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(loginIDKey) ?? "";
}

export function saveLoginID(loginID: string) {
  window.localStorage.setItem(loginIDKey, loginID);
}

export function clearAuth() {
  window.localStorage.removeItem(tokenKey);
  window.localStorage.removeItem(loginIDKey);
}
