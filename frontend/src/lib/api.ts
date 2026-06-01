import type { AppDataResponse, AuthSession, Expense, FuelComparisonResponse, FuelMarketResponse, FuelPriceResponse, FuelTrendResponse, MoneyTotals, UserSettings, Vehicle, VinDecode } from "./types";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:18080";
let tokenHandler: ((token: string) => void) | undefined;

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function onTokenRefresh(handler: (token: string) => void) {
  tokenHandler = handler;
}

export async function register() {
  return sendJSON<AuthSession>("/auth/register", "POST", {});
}

export async function healthCheck() {
  return getJSON<{ status: string; database: string }>("/healthz", undefined, 2500);
}

export async function login(loginID: string) {
  return sendJSON<AuthSession>("/auth/login", "POST", { login_id: loginID });
}

export async function getSession(token?: string) {
  return getJSON<{ user_id: string; max_vehicles: number; settings: UserSettings }>("/auth/session", token);
}

export async function getUserSettings(token: string) {
  return getJSON<UserSettings>("/user/settings", token);
}

export async function getAppData(token: string) {
  return getJSON<AppDataResponse>("/app-data", token);
}

export async function updateUserSettings(token: string, settings: UserSettings) {
  return sendJSON<UserSettings>("/user/settings", "PUT", settings, token);
}

export async function getVehicles(token: string) {
  return getJSON<Vehicle[]>("/vehicles", token);
}

export async function getVehicleMakes() {
  return getJSON<string[]>("/vehicle-options/makes");
}

export async function getVehicleModels(make: string) {
  return getJSON<string[]>(`/vehicle-options/models?make=${encodeURIComponent(make)}`);
}

export async function decodeVIN(vin: string) {
  return getJSON<VinDecode>(`/vehicle-options/vin/${encodeURIComponent(vin)}`);
}

export async function getExpenses(token: string) {
  return getJSON<Expense[]>("/expenses", token);
}

export async function getAnalytics(token: string, vehicleID?: string) {
  const query = vehicleID ? `?vehicle_id=${encodeURIComponent(vehicleID)}` : "";
  return getJSON<MoneyTotals>(`/analytics${query}`, token);
}

export async function getFuelPrices(token: string, country: string, fuelType: string, region = "") {
  const params = new URLSearchParams({ country, fuel_type: fuelType, limit: "6" });
  if (region.trim()) params.set("region", region.trim());
  return getJSON<FuelPriceResponse>(`/fuel-prices?${params.toString()}`, token);
}

export async function getFuelTrends(token: string, country: string) {
  return getJSON<FuelTrendResponse>(`/fuel-trends?country=${encodeURIComponent(country)}`, token);
}

export async function getFuelComparison(token: string, country: string, compareCountry: string) {
  const params = new URLSearchParams({ country, compare_country: compareCountry });
  return getJSON<FuelComparisonResponse>(`/fuel-comparison?${params.toString()}`, token);
}

export async function getFuelMarket(token: string, country: string, compareCountry: string) {
  const params = new URLSearchParams({ country, compare_country: compareCountry });
  return getJSON<FuelMarketResponse>(`/fuel-market?${params.toString()}`, token);
}

export async function createVehicle(token: string, vehicle: Partial<Vehicle>) {
  return sendJSON<Vehicle>("/vehicles", "POST", vehicle, token);
}

export async function updateVehicle(token: string, id: string, vehicle: Partial<Vehicle>) {
  return sendJSON<Vehicle>(`/vehicles/${encodeURIComponent(id)}`, "PUT", vehicle, token);
}

export async function createExpense(token: string, expense: Partial<Expense>) {
  return sendJSON<Expense>("/expenses", "POST", expense, token);
}

export async function updateExpense(token: string, id: string, expense: Partial<Expense>) {
  return sendJSON<Expense>(`/expenses/${encodeURIComponent(id)}`, "PUT", expense, token);
}

export async function deleteVehicle(token: string, id: string) {
  const response = await fetch(`${apiBase}/vehicles/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
    credentials: "include",
  });
  refreshToken(response);
  if (!response.ok) throw await apiError(response, "delete vehicle failed");
}

async function getJSON<T>(path: string, token?: string, timeoutMs?: number) {
  const controller = timeoutMs ? new AbortController() : undefined;
  const timeout = timeoutMs ? window.setTimeout(() => controller?.abort(), timeoutMs) : undefined;
  try {
    const response = await fetch(`${apiBase}${path}`, {
      headers: token ? authHeaders(token) : undefined,
      credentials: "include",
      signal: controller?.signal,
    });
    refreshToken(response);
    if (!response.ok) throw await apiError(response, `${path} failed`);
    return response.json() as Promise<T>;
  } finally {
    if (timeout) window.clearTimeout(timeout);
  }
}

async function sendJSON<T>(path: string, method: "POST" | "PUT", body: unknown, token?: string) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    credentials: "include",
    body: JSON.stringify(body),
  });
  refreshToken(response);
  if (!response.ok) throw await apiError(response, `${path} failed`);
  return response.json() as Promise<T>;
}

function authHeaders(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function refreshToken(response: Response) {
  const header = response.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return;
  tokenHandler?.(header.slice("Bearer ".length));
}

async function apiError(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: string; detail?: string };
    return new ApiError(body.detail || body.error || fallback, response.status);
  } catch {
    return new ApiError(fallback, response.status);
  }
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function logClientError(event: { level?: "warn" | "error"; area: string; message: string; detail?: string; context?: Record<string, unknown> }) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    level: event.level ?? "error",
    area: event.area,
    message: scrub(event.message),
    detail: scrub(event.detail ?? ""),
    path: window.location.pathname,
    standalone: window.matchMedia?.("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)),
    context: event.context ?? {},
  });
  const url = `${apiBase}/client-errors`;
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body,
    keepalive: true,
  }).catch(() => {});
}

function scrub(value: string) {
  return value.replace(/\b\d{8,}\b/g, "[number]").replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]");
}
