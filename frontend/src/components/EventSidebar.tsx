import React from "react";
import { TacticalHudCard } from "./TacticalHudCard";

interface EventSidebarProps {
  activeIncident: any;
  simResult: any;
  showQuarantine: boolean;
  setShowQuarantine: (val: boolean) => void;
}

export const EventSidebar: React.FC<EventSidebarProps> = ({
  activeIncident,
  simResult,
  showQuarantine,
  setShowQuarantine
}) => {
  if (!activeIncident) {
    return (
      <TacticalHudCard title="Threat Incident Watch" subtitle="MONITORING LAYER" cornerIndicator="SYS//MON">
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
          <div className="w-12 h-12 border border-slate-800 border-dashed animate-spin flex items-center justify-center mb-3">
            <span className="text-[10px] text-slate-600">SYS</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold">
            No Active Incidents Detected
          </span>
          <span className="text-[8px] text-slate-600 uppercase mt-1">
            Standby: Monitoring spatiotemporal nodes.
          </span>
        </div>
      </TacticalHudCard>
    );
  }

  // Calculate mock delays based on incident severity
  const severity = activeIncident.severity || 5;
  const baselineDelay = severity * 11 + 8; // minutes
  const optimizedDelay = Math.round(severity * 3.5 + 3); // minutes
  const delaySaved = baselineDelay - optimizedDelay;
  const percentageCut = Math.round((delaySaved / baselineDelay) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Incident Parameters */}
      <TacticalHudCard
        title={activeIncident.event_type}
        subtitle="ACTIVE INCIDENT DETAILS"
        statusColor="danger"
        cornerIndicator="SYS//INCID"
      >
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2 border-b border-slate-900 pb-2">
            <div>
              <span className="text-[8px] text-slate-500 uppercase block">GEOLOCATION</span>
              <span className="text-[10px] font-bold text-slate-300">
                {activeIncident.latitude.toFixed(4)}N, {activeIncident.longitude.toFixed(4)}E
              </span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 uppercase block">SEVERITY INDEX</span>
              <span className="text-[10px] font-bold text-danger">
                {activeIncident.severity}/10 (CRITICAL)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-900 pb-2">
            <div>
              <span className="text-[8px] text-slate-500 uppercase block">BLAST RADIUS</span>
              <span className="text-[10px] font-bold text-slate-300">
                {simResult?.blast_radius_meters || (severity * 150)} Meters
              </span>
            </div>
            <div>
              <span className="text-[8px] text-slate-500 uppercase block">IMPACTED NODES</span>
              <span className="text-[10px] font-bold text-slate-300">
                {simResult?.impacted_nodes?.length || 0} Junctions
              </span>
            </div>
          </div>

          {/* Cordon Zone Toggle */}
          <div className="flex items-center justify-between py-1 bg-black/40 border border-slate-900 px-2">
            <span className="text-[9px] text-slate-400 uppercase font-semibold">LOGISTICS CORDON PERIMETER</span>
            <button
              onClick={() => setShowQuarantine(!showQuarantine)}
              className={`text-[8px] px-2 py-0.5 border font-bold uppercase rounded-none transition duration-150 ${
                showQuarantine
                  ? "border-danger bg-danger/10 text-danger"
                  : "border-slate-700 bg-slate-950 text-slate-500 hover:border-slate-500 hover:text-slate-300"
              }`}
            >
              {showQuarantine ? "SECURED (ON)" : "STANDBY (OFF)"}
            </button>
          </div>
        </div>
      </TacticalHudCard>

      {/* 2. Counterfactual Delays */}
      <TacticalHudCard title="Counterfactual Projections" subtitle="ST-GNN CORRIDOR PREDICTIONS" cornerIndicator="SYS//PRED">
        <div className="flex flex-col gap-3">
          <div className="bg-black/60 border border-slate-900 p-2 relative">
            <div className="absolute top-1.5 right-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block animate-pulse" />
              <span className="text-[8px] text-danger uppercase">Baseline</span>
            </div>
            <span className="text-[8px] text-slate-500 uppercase block">UNMANAGED CASCADE DELAY</span>
            <span className="text-xl font-bold text-slate-300 font-mono tracking-tight">
              {baselineDelay} <span className="text-[10px] font-normal text-slate-500">MINUTES</span>
            </span>
          </div>

          <div className="bg-black/60 border border-slate-900 p-2 relative">
            <div className="absolute top-1.5 right-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              <span className="text-[8px] text-success uppercase">Aegis Active</span>
            </div>
            <span className="text-[8px] text-slate-500 uppercase block">OPTIMIZED TRANSIT ROUTE DELAY</span>
            <span className="text-xl font-bold text-success font-mono tracking-tight">
              {optimizedDelay} <span className="text-[10px] font-normal text-success">MINUTES</span>
            </span>
          </div>

          {/* Saving percentage banner */}
          <div className="border border-success/30 bg-success/5 p-2 flex items-center justify-between rounded-none">
            <div className="flex flex-col">
              <span className="text-[8px] text-success uppercase leading-none font-semibold mb-0.5">ESTIMATED EFFICIENCY GAIN</span>
              <span className="text-[10px] text-slate-300 leading-tight">Cascading Congestion Prevented</span>
            </div>
            <span className="text-lg font-black text-success tracking-tighter">
              -{percentageCut}%
            </span>
          </div>
        </div>
      </TacticalHudCard>
    </div>
  );
};

export default EventSidebar;
