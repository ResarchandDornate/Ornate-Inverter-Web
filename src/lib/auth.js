// Browser-only auth helpers. Token lives in sessionStorage so it dies when
// the tab/browser closes — that way every fresh visit to the portal starts
// at the login screen, matching the standard "secure portal" flow.
const TOKEN_KEY = "userToken";
const PROFILE_KEY = "userProfile";

export const getToken = () => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
};

export const setToken = (token) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(PROFILE_KEY);
  // Also wipe any lingering localStorage token from older versions.
  window.localStorage.removeItem(TOKEN_KEY);
};

export const isAuthenticated = () => !!getToken();

/* ------------------------------------------------------------------ *
 * Roles
 *
 * Two audiences share this app:
 *   operator — Ornate staff, sees the whole fleet (/dashboard, /inverters, …)
 *   customer — someone who bought a system, sees only their own (/my-system)
 *
 * The role is whatever the backend puts on the signin response. Treat it as a
 * routing hint ONLY. It decides which screens render, never which data is
 * allowed out — a customer must be scoped server-side, because the browser
 * receives whatever the API sends regardless of what we draw.
 * ------------------------------------------------------------------ */

export const ROLE_OPERATOR = "operator";
export const ROLE_CUSTOMER = "customer";

// Role strings the backend has used for end customers. Anything not listed
// here falls back to operator, so a new/unknown role never silently loses
// access to the staff portal.
const CUSTOMER_ROLE_VALUES = new Set([
  "customer",
  "end_user",
  "enduser",
  "end-user",
  "owner",
  "plant_owner",
  "client",
]);

export const normalizeRole = (raw) => {
  const value = String(raw ?? "").trim().toLowerCase();
  return CUSTOMER_ROLE_VALUES.has(value) ? ROLE_CUSTOMER : ROLE_OPERATOR;
};

// The signin payload shape has moved around before (see login/page.js), so
// read the role from every place it has plausibly lived.
export const extractProfile = (res) => {
  const user = res?.user ?? res?.data?.user ?? res?.data ?? res ?? {};
  const rawRole =
    user.role ?? user.user_role ?? user.type ?? res?.role ?? res?.data?.role ?? null;

  return {
    role: normalizeRole(rawRole),
    rawRole: rawRole ?? null,
    email: user.email ?? null,
    name:
      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
      user.name ||
      user.full_name ||
      null,
  };
};

export const setProfile = (profile) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile ?? {}));
};

export const getProfile = () => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(PROFILE_KEY) || "null");
  } catch {
    return null;
  }
};

export const getRole = () => getProfile()?.role ?? ROLE_OPERATOR;
export const isCustomer = () => getRole() === ROLE_CUSTOMER;

// Where a freshly signed-in user belongs.
export const homeRouteForRole = (role) =>
  role === ROLE_CUSTOMER ? "/my-system" : "/dashboard";
