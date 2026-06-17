import React from "react";
import { TacticalHudCard } from "./TacticalHudCard";

interface DispatchPanelProps {
  dispatchData: any;
  deploymentState: "IDLE" | "PENDING" | "DISPATCHED" | "ACTIVE";
  isLoading: boolean;
}

export const DispatchPanel: React.FC<DispatchPanelProps> = ({
  dispatchData,
  deploymentState,
  isLoading
}) => {
  if (isLoading) {
    return (
      <TacticalHudCard title="BTP Tactical Dispatch" subtitle="INTELLIGENCE SOPS" cornerIndicator="SYS//SOP">
        <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-center">
          <div className="w-8 h-8 border border-primary border-t-transparent animate-spin mb-3 rounded-none" />
          <span className="text-[10px] uppercase tracking-wider font-semibold text-primary">
            Synthesizing Tactical SOP via Gemini Core...
          </span>
          <span className="text-[8px] text-slate-600 uppercase mt-1">
            Running translation algorithms and personnel projection models.
          </span>
        </div>
      </TacticalHudCard>
    );
  }

  if (!dispatchData) {
    return (
      <TacticalHudCard title="BTP Tactical Dispatch" subtitle="INTELLIGENCE SOPS" cornerIndicator="SYS//SOP">
        <div className="flex flex-col items-center justify-center py-10 text-slate-600 text-center">
          <span className="text-[10px] uppercase tracking-wider font-semibold">
            No Active Dispatch Orders
          </span>
          <span className="text-[8px] text-slate-600 uppercase mt-1">
            SOP coordinates are generated dynamically when a mitigation plan is executed.
          </span>
        </div>
      </TacticalHudCard>
    );
  }

  const { action_plan_english, action_plan_kannada, required_personnel, required_barricades } =
    dispatchData.intelligence_output || {};

  const stateConfig = {
    IDLE: { label: "INACTIVE", color: "text-slate-600 border-slate-900 bg-slate-950/20" },
    PENDING: { label: "TRANSMITTING SOP...", color: "text-alert border-alert/30 bg-alert/5 animate-pulse" },
    DISPATCHED: { label: "PRECINCT RADIO BROADCAST COMPLETE", color: "text-primary border-primary/30 bg-primary/5" },
    ACTIVE: { label: "TACTICAL FORCES ACTIVE ON-SITE", color: "text-success border-success/30 bg-success/5" }
  };

  const currentStatus = stateConfig[deploymentState] || stateConfig.IDLE;

  return (
    <div className="flex flex-col gap-4">
      {/* SOP dual language plans */}
      <TacticalHudCard title="BTP Radio Dispatch SOP" subtitle="INTELLIGENCE SOPS" statusColor={deploymentState === "ACTIVE" ? "success" : "primary"} cornerIndicator="SYS//SOP">
        <div className="flex flex-col gap-3">
          
          {/* Deployment Phase Banner */}
          <div className={`border p-2 text-center text-[10px] font-bold uppercase ${currentStatus.color}`}>
            {currentStatus.label}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Resources allocated */}
            <div className="bg-black/60 border border-slate-900 p-2 flex flex-col justify-between">
              <span className="text-[8px] text-slate-500 uppercase leading-none">POLICE PERSONNEL</span>
              <span className="text-2xl font-black text-primary font-mono tracking-tighter mt-1">
                {required_personnel || 0} <span className="text-[9px] font-normal text-slate-500">COPS</span>
              </span>
            </div>
            
            <div className="bg-black/60 border border-slate-900 p-2 flex flex-col justify-between">
              <span className="text-[8px] text-slate-500 uppercase leading-none">CORDON BARRICADES</span>
              <span className="text-2xl font-black text-primary font-mono tracking-tighter mt-1">
                {required_barricades || 0} <span className="text-[9px] font-normal text-slate-500">UNITS</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-900 pt-2.5">
            {/* English instruction */}
            <div className="bg-black/40 border border-slate-950 p-2 text-[10px] text-slate-300 leading-relaxed font-mono">
              <span className="text-[8px] text-primary font-semibold uppercase block mb-1">
                [RADIO SOP ENGLISH RELAY]
              </span>
              {action_plan_english}
            </div>

            {/* Kannada instruction */}
            <div className="bg-black/40 border border-slate-950 p-2 text-[11px] text-emerald-400/90 leading-relaxed font-sans">
              <span className="text-[8px] text-success font-semibold uppercase block mb-1 font-mono">
                [ರೇಡಿಯೋ ಎಸ್‌ಒಪಿ ಕನ್ನಡ ಪ್ರಸಾರ]
              </span>
              {action_plan_kannada}
            </div>
          </div>
        </div>
      </TacticalHudCard>
    </div>
  );
};

export default DispatchPanel;
