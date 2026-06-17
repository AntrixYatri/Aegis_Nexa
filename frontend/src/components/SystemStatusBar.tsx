import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface SystemStatusBarProps {
  systemState: "IDLE" | "SIMULATING" | "MITIGATED" | "CRITICAL";
  impactCount?: number;
}

export const SystemStatusBar: React.FC<SystemStatusBarProps> = ({
  systemState,
  impactCount = 0
}) => {
  const [time, setTime] = useState<string>("");
  const [latency, setLatency] = useState<number>(12);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toISOString().replace("T", " // ").substring(0, 22));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const latInterval = setInterval(() => {
      setLatency(prev => Math.max(8, Math.min(22, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 3000);
    return () => clearInterval(latInterval);
  }, []);

  const stateColors = {
    IDLE: { bg: "bg-slate-900", text: "text-slate-400", label: "STANDBY" },
    SIMULATING: { bg: "bg-amber-950/40 border-amber-500", text: "text-amber-400", label: "FORECAST ACTIVE" },
    CRITICAL: { bg: "bg-red-950/50 border-red-500", text: "text-red-500", label: "CONGESTION ESCALATION" },
    MITIGATED: { bg: "bg-emerald-950/40 border-emerald-500", text: "text-emerald-400", label: "MITIGATION RESOLVING" }
  };

  const activeState = stateColors[systemState];

  return (
    <div className="w-full bg-black border-b border-slate-800 text-[11px] font-mono flex items-center justify-between px-4 py-2 select-none h-10 shrink-0">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-primary inline-block glow-cyan animate-pulse" />
          <h1 className="text-xs font-bold uppercase tracking-tactical text-primary">
            AEGIS NEXA
          </h1>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400 uppercase tracking-widest text-[9px]">
          Counterfactual Command & Control OS
        </span>
      </div>

      {/* Center Operational State Indicator */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 px-3 py-0.5 border border-slate-800 rounded-none bg-black/60`}>
          <span className="text-slate-500 text-[9px] uppercase tracking-wider">ENGINE STATE:</span>
          <span className={`font-semibold tracking-wider text-[9px] ${activeState.text}`}>
            {activeState.label}
          </span>
        </div>

        {impactCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-0.5 border border-danger/40 bg-danger/5 text-[9px] text-danger">
            <span className="animate-pulse">▲ WARNING: {impactCount} COGNITIVE THREAT NODES DETECTED</span>
          </div>
        )}
      </div>

      {/* Diagnostics Panel & Clock */}
      <div className="flex items-center gap-4">
        {/* API statuses */}
        <div className="flex items-center gap-3 text-slate-500 text-[9px]">
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-success inline-block" />
            <span>ST-GNN: ONLINE</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-success inline-block" />
            <span>GEMINI: READY</span>
          </div>
          <div className="flex items-center gap-1">
            <span>PING: {latency}MS</span>
          </div>
        </div>

        <span className="text-slate-600">|</span>

        {/* Real-time Clock */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 tracking-wider font-semibold">
            {time}
          </span>
          <span className="text-slate-500 font-bold bg-slate-900 px-1 py-0.5 text-[8px] uppercase tracking-widest border border-slate-800">
            LOC
          </span>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusBar;
