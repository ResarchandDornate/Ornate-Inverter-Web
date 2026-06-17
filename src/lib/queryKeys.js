export const QUERY_KEYS = {
  INVERTERS: ["inverters"],
  USER_SUMMARY: ["userSummary"],
  INVERTER_DETAILS: (id) => ["inverterDetails", id],
  GRID_STATUS: (id) => ["gridStatus", id],
};
