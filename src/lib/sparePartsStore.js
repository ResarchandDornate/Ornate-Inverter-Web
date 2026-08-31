// Client-side persistence for spare parts requests — a frontend preview only.
// Requests are stored in localStorage so the "New Request" flow (a separate
// page, not a modal) can hand off to the list page after creating one. Your
// backend should replace this with a real API once the Data Logger service
// exposes spare-parts endpoints.
const STORAGE_KEY = "dataLoggerSparePartsRequests";

function read() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(requests) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

export function getSparePartsRequests() {
  return read().sort((a, b) => b.createdAt - a.createdAt);
}

export function addSparePartsRequest({ installation, items, status }) {
  const requests = read();
  const nextNumber = requests.length + 1001;
  const request = {
    id: `SPR-${nextNumber}`,
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    company: "Ornate Solar Pvt Ltd",
    installation,
    user: "Operator",
    status,
    items,
    createdAt: Date.now(),
  };
  write([...requests, request]);
  return request;
}
