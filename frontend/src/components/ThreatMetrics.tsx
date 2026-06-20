import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { TacticalHudCard } from "./TacticalHudCard";

interface ThreatMetricsProps {
  activeIncident: any;
}

export const ThreatMetrics: React.FC<ThreatMetricsProps> = ({ activeIncident }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <TacticalHudCard title="System Diagnostics Feed" subtitle="METRIC ENGINE" cornerIndicator="SYS//METR">
        <div className="h-40 flex items-center justify-center text-slate-600 text-[10px]">
          INITIALIZING RECHARTS PLOT ENGINE...
        </div>
      </TacticalHudCard>
    );
  }

  // Base metrics that adapt if there is an active incident
  const severity = activeIncident?.severity || 0;

  // 1. Spatiotemporal speed over time (baseline vs optimized)
  const speedData = [
    { time: "T-25s", Baseline: 38 - severity * 0.5, Optimized: 38 - severity * 0.1 },
    { time: "T-20s", Baseline: 34 - severity * 0.9, Optimized: 36 - severity * 0.2 },
    { time: "T-15s", Baseline: 28 - severity * 1.5, Optimized: 34 - severity * 0.3 },
    { time: "T-10s", Baseline: 22 - severity * 2.0, Optimized: 32 - severity * 0.4 },
    { time: "T-5s", Baseline: 16 - severity * 2.5, Optimized: 30 - severity * 0.5 },
    { time: "T-0s", Baseline: Math.max(5, 12 - severity * 2.8), Optimized: Math.max(20, 29 - severity * 0.6) },
  ];

  // 2. Zone threat indices (Central, East, Outer Ring, West)
  const zoneData = [
    { zone: "Central CBD", Congestion: 25 + severity * 6.5, fill: "#00e5ff" },
    { zone: "Silk Board SE", Congestion: 30 + (activeIncident?.event_type === "Waterlogging" ? 55 : severity * 4.5), fill: "#1f2937" },
    { zone: "Hebbal North", Congestion: 18 + severity * 3.5, fill: "#1f2937" },
    { zone: "Whitefield E", Congestion: 35 + severity * 4.0, fill: "#1f2937" }
  ];

  // Make active zone color red if it matches the active incident
  if (activeIncident) {
    zoneData.forEach(d => {
      if (severity > 5 && d.Congestion > 50) {
        d.fill = "#ff3b3b"; // Danger color
      } else {
        d.fill = d.zone.includes("CBD") ? "#00e5ff" : "#334155";
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chart 1: Grid Velocity Profiles */}
      <TacticalHudCard title="Corridor Grid Velocity Profile" subtitle="SPATIOTEMPORAL TRAFFIC VECTORS" cornerIndicator="SYS//VEC">
        <span className="text-[9px] text-slate-500 uppercase block mb-2">Average Flow Speed (km/h) over Time</span>
        <div className="h-32 w-full text-[9px] font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={speedData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke="#64748b" tickLine={false} />
              <YAxis stroke="#64748b" domain={[0, 50]} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#000", border: "1px solid #1f2937", borderRadius: 0 }}
                labelStyle={{ color: "#00e5ff", fontWeight: "bold", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Line type="monotone" dataKey="Baseline" stroke="#ff3b3b" strokeWidth={1.5} dot={false} name="Baseline (Unmitigated)" />
              <Line type="monotone" dataKey="Optimized" stroke="#00ff88" strokeWidth={1.5} dot={false} name="Aegis Reroute" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </TacticalHudCard>

      {/* Chart 2: Regional Threat Levels */}
      <TacticalHudCard title="Zone Congestion Thresholds" subtitle="GRID VECTOR DENSITY" cornerIndicator="SYS//BAR">
        <span className="text-[9px] text-slate-500 uppercase block mb-2">Saturation Level %</span>
        <div className="h-32 w-full text-[9px] font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={zoneData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="zone" stroke="#64748b" tickLine={false} />
              <YAxis stroke="#64748b" domain={[0, 100]} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#000", border: "1px solid #1f2937", borderRadius: 0 }}
                labelStyle={{ color: "#00e5ff", fontWeight: "bold", fontSize: "10px" }}
                itemStyle={{ fontSize: "10px" }}
              />
              <Bar dataKey="Congestion" fill="#00e5ff" radius={0} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TacticalHudCard>
    </div>
  );
};

export default ThreatMetrics;
