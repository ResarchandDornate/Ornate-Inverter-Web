// One description of every parameter that arrives on the MQTT telemetry row,
// grouped the way an inverter is actually wired: DC in from the array, AC out
// to the grid, then the device's own health. hopeCloud splits its device page
// the same way ("AC Parameters" / "AC-DC Parameters"), and it is the split
// installers and customers already think in.
//
// A telemetry row (/inverter/inverter-data/, /inverter/inverters/latest_telemetry/)
// carries: voltage, current, power_in, power_out, vpv, ipv, delta, power_factor,
// fault_bitmask, hw_fault, temperature, grid_connected, queued_offline,
// timestamp_is_estimated.
//
// `audience: "operator"` keeps a field out of the customer-facing screens —
// raw bitmasks and transport flags mean nothing to someone who bought a system.

export const AUDIENCE_ALL = "all";
export const AUDIENCE_OPERATOR = "operator";

export const PARAM_GROUPS = [
  {
    id: "dc",
    label: "DC Input",
    caption: "What the solar array is delivering into the inverter.",
    params: [
      { key: "vpv", label: "PV Voltage", unit: "V", decimals: 1, audience: AUDIENCE_ALL },
      { key: "ipv", label: "PV Current", unit: "A", decimals: 2, audience: AUDIENCE_ALL },
      {
        key: "power_in",
        label: "DC Input Power",
        unit: "W",
        decimals: 0,
        audience: AUDIENCE_ALL,
      },
    ],
  },
  {
    id: "ac",
    label: "AC Output",
    caption: "What the inverter is exporting to the grid.",
    params: [
      { key: "voltage", label: "Grid Voltage", unit: "V", decimals: 1, audience: AUDIENCE_ALL },
      { key: "current", label: "Output Current", unit: "A", decimals: 2, audience: AUDIENCE_ALL },
      {
        key: "power_out",
        label: "AC Output Power",
        unit: "W",
        decimals: 0,
        audience: AUDIENCE_ALL,
      },
      {
        key: "power_factor",
        label: "Power Factor",
        unit: "",
        decimals: 2,
        audience: AUDIENCE_ALL,
      },
      {
        key: "grid_connected",
        label: "Grid Connection",
        type: "bool",
        trueLabel: "Connected",
        falseLabel: "Disconnected",
        goodWhen: true,
        audience: AUDIENCE_ALL,
      },
    ],
  },
  {
    id: "device",
    label: "Device Health",
    caption: "The inverter's own condition.",
    params: [
      {
        key: "temperature",
        label: "Internal Temperature",
        unit: "°C",
        decimals: 1,
        audience: AUDIENCE_ALL,
      },
      {
        key: "hw_fault",
        label: "Hardware Fault",
        type: "bool",
        trueLabel: "Present",
        falseLabel: "None",
        goodWhen: false,
        audience: AUDIENCE_ALL,
      },
      {
        key: "fault_bitmask",
        label: "Fault Bitmask",
        type: "raw",
        audience: AUDIENCE_OPERATOR,
      },
      { key: "delta", label: "Delta", unit: "", decimals: 2, audience: AUDIENCE_OPERATOR },
    ],
  },
  {
    id: "transport",
    label: "Data Quality",
    caption: "How this reading reached the platform.",
    params: [
      {
        key: "queued_offline",
        label: "Buffered While Offline",
        type: "bool",
        trueLabel: "Yes",
        falseLabel: "No",
        goodWhen: false,
        audience: AUDIENCE_OPERATOR,
      },
      {
        key: "timestamp_is_estimated",
        label: "Estimated Timestamp",
        type: "bool",
        trueLabel: "Yes",
        falseLabel: "No",
        goodWhen: false,
        audience: AUDIENCE_OPERATOR,
      },
    ],
  },
];

// Conversion efficiency is the one number that ties the DC and AC sides
// together, and it is the single best "is my system healthy" signal a customer
// can read without knowing anything about inverters.
export function conversionEfficiency(row) {
  const pin = Number(row?.power_in);
  const pout = Number(row?.power_out);
  if (!Number.isFinite(pin) || !Number.isFinite(pout) || pin <= 0) return null;
  const pct = (pout / pin) * 100;
  // Guard against sensor noise at dawn/dusk producing absurd ratios.
  if (pct < 0 || pct > 100) return null;
  return pct;
}

// Groups filtered for an audience, with empty groups dropped.
export function groupsForAudience(audience) {
  return PARAM_GROUPS.map((g) => ({
    ...g,
    params: g.params.filter(
      (p) => audience === AUDIENCE_OPERATOR || p.audience === AUDIENCE_ALL
    ),
  })).filter((g) => g.params.length > 0);
}

// Render one parameter off a telemetry row into { text, tone }.
// tone: "good" | "bad" | "neutral" — drives the colour, nothing else.
export function formatParam(param, row) {
  const raw = row?.[param.key];

  if (raw === null || raw === undefined || raw === "") {
    return { text: "–", tone: "neutral", missing: true };
  }

  if (param.type === "bool") {
    const on = raw === true || raw === 1 || raw === "1" || raw === "true";
    const tone =
      param.goodWhen === undefined ? "neutral" : on === param.goodWhen ? "good" : "bad";
    return { text: on ? param.trueLabel : param.falseLabel, tone };
  }

  if (param.type === "raw") {
    return { text: String(raw), tone: "neutral", mono: true };
  }

  const n = Number(raw);
  if (!Number.isFinite(n)) return { text: String(raw), tone: "neutral" };

  return {
    text: n.toLocaleString(undefined, {
      minimumFractionDigits: param.decimals ?? 2,
      maximumFractionDigits: param.decimals ?? 2,
    }),
    unit: param.unit,
    tone: "neutral",
  };
}
