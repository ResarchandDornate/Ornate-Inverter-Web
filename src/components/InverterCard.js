"use client";

import Link from "next/link";
import { Zap, ZapOff, MapPin } from "lucide-react";

export default function InverterCard({ inverter }) {
  const { id, name, serial_number, city, grid_connected } = inverter;
  const connected = grid_connected === true;

  return (
    <Link
      href={`/inverter/${id}`}
      className="block bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:border-orange-200 hover:shadow-md transition"
    >
      <div className="flex items-center">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
            connected ? "bg-green-50" : "bg-red-50"
          }`}
        >
          {connected ? (
            <Zap size={22} className="text-green-600" />
          ) : (
            <ZapOff size={22} className="text-red-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-slate-800 truncate">{name}</span>
            <span
              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                connected
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {connected ? "ON" : "OFF"}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            SN: {serial_number}
          </div>
          {city && (
            <div className="flex items-center text-[11px] text-slate-400 mt-0.5">
              <MapPin size={10} className="mr-1" /> {city}
            </div>
          )}
        </div>
        <div className="text-orange-500 font-bold">→</div>
      </div>
    </Link>
  );
}
