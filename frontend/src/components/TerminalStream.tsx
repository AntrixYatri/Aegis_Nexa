import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

export interface LogMessage {
  timestamp: string;
  message: string;
  type: "info" | "warn" | "critical" | "success";
}

interface TerminalStreamProps {
  logs: LogMessage[];
  onAddLog: (msg: string, type: LogMessage["type"]) => void;
  onClearLogs: () => void;
}

export const TerminalStream: React.FC<TerminalStreamProps> = ({
  logs,
  onAddLog,
  onClearLogs
}) => {
  const [inputVal, setInputVal] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const cmd = inputVal.trim();
    onAddLog(`[OPERATOR] ${cmd}`, "info");
    setInputVal("");

    // Simple manual shell parser for command center feel
    const lowercaseCmd = cmd.toLowerCase();
    if (lowercaseCmd === "/help") {
      setTimeout(() => {
        onAddLog("[SYS] AVAILABLE COMMANDS:\n  /clear - Clean terminal canvas\n  /status - Query ST-GNN prediction state\n  /radar - Pulse grid coordinates\n  /nodes - Check active bottleneck node counts", "info");
      }, 300);
    } else if (lowercaseCmd === "/clear") {
      setTimeout(() => {
        onClearLogs();
      }, 100);
    } else if (lowercaseCmd === "/status") {
      setTimeout(() => {
        onAddLog("[SYS] SERVICES STATUS: FastAPI(8000) online, Gemini Engine operational, Mapbox vector canvas buffered.", "success");
      }, 400);
    } else if (lowercaseCmd === "/radar") {
      setTimeout(() => {
        onAddLog("[SYS] RADAR RANGE DETECTOR ACTIVE. PINGING 45 FLIPKART TRANSIT VANS.", "info");
      }, 300);
    } else if (lowercaseCmd === "/nodes") {
      setTimeout(() => {
        onAddLog("[SYS] SCANNING LATENCY BOTTLENECK NODES. Silk Board intersection reporting 2.4x saturation scale.", "warn");
      }, 400);
    } else {
      setTimeout(() => {
        onAddLog(`[SYS] COMMAND '${cmd.split(" ")[0]}' NOT REGISTERED IN AURAOS COMMAND SCHEMATIC. TYPE /help FOR LIST.`, "warn");
      }, 300);
    }
  };

  const logTypeColors = {
    info: "text-primary",
    warn: "text-alert",
    critical: "text-danger font-semibold",
    success: "text-success"
  };

  return (
    <div className="w-full bg-black border-t border-slate-800 flex flex-col h-40 font-mono text-[10px] select-text select-none shrink-0 relative">

      {/* Terminal Header */}
      <div className="flex justify-between items-center border-b border-slate-900 bg-slate-950 px-4 py-1 flex-none h-6">
        <span className="text-slate-500 uppercase tracking-widest text-[8px] font-bold">
          AURAOS COGNITIVE CORE v1.0.0 // LIVE LOG STREAM
        </span>
        <button
          onClick={onClearLogs}
          className="text-slate-600 hover:text-slate-400 uppercase tracking-wider text-[8px] border border-slate-900 px-1.5 hover:border-slate-700 transition rounded-none bg-black"
        >
          Flush Logs
        </button>
      </div>

      {/* Terminal Log Container */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1.5 scrollbar-thin">
        {logs.map((log, idx) => (
          <div key={idx} className="flex gap-2.5 items-start leading-relaxed">
            <span className="text-slate-600 font-light select-none whitespace-nowrap">
              [{log.timestamp}]
            </span>
            <span className={`${logTypeColors[log.type]} whitespace-pre-wrap flex-1`}>
              {log.message}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Terminal Prompt input */}
      <form
        onSubmit={handleCommandSubmit}
        className="border-t border-slate-900 bg-slate-950 px-4 py-1.5 flex items-center gap-2 flex-none h-8"
      >
        <span className="text-primary font-bold select-none">&gt;_</span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="ENTER SYSTEM DIRECTIVES... (Type /help for console options)"
          className="bg-transparent border-none outline-none flex-1 text-primary text-[10px] font-mono focus:ring-0 focus:outline-none placeholder-slate-700 select-text"
        />
        <span className="w-1.5 h-3 bg-primary animate-pulse" />
      </form>
    </div>
  );
};

export default TerminalStream;
