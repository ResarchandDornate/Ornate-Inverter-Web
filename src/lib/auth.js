// Browser-only auth helpers. Token lives in sessionStorage so it dies when
// the tab/browser closes — that way every fresh visit to the portal starts
// at the login screen, matching the standard "secure portal" flow.
const TOKEN_KEY = "userToken";

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
  // Also wipe any lingering localStorage token from older versions.
  window.localStorage.removeItem(TOKEN_KEY);
};

export const isAuthenticated = () => !!getToken();
