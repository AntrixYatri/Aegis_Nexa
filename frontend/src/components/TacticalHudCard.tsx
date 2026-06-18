import React from "react";
import { motion } from "framer-motion";

interface TacticalHudCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  statusColor?: "primary" | "danger" | "success" | "alert";
  cornerIndicator?: string;
  statusText?: string;
  isWarning?: boolean;
}

export const TacticalHudCard: React.FC<TacticalHudCardProps> = ({
  title,
  subtitle,
  children,
  className = "",
  statusColor = "primary",
  cornerIndicator = "SYS//01",
  statusText,
  isWarning = false
}) => {
  const activeStatusColor = isWarning ? "danger" : statusColor;

  const borderColors = {
    primary: "border-primary",
    danger: "border-danger",
    success: "border-success",
    alert: "border-alert"
  };

  const textColors = {
    primary: "text-primary",
    danger: "text-danger",
    success: "text-success",
    alert: "text-alert"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`relative border border-slate-800 bg-bg-tactical bg-tactical-grid flex flex-col p-4 rounded-none ${className}`}
    >
      {/* Absolute Corner Accents */}
      <div className="absolute top-0 left-0 w-2 h-[1px] bg-slate-600" />
      <div className="absolute top-0 left-0 w-[1px] h-2 bg-slate-600" />

      <div className="absolute top-0 right-0 w-2 h-[1px] bg-slate-600" />
      <div className="absolute top-0 right-0 w-[1px] h-2 bg-slate-600" />

      <div className="absolute bottom-0 left-0 w-2 h-[1px] bg-slate-600" />
      <div className="absolute bottom-0 left-0 w-[1px] h-2 bg-slate-600" />

      <div className="absolute bottom-0 right-0 w-2 h-[1px] bg-slate-600" />
      <div className="absolute bottom-0 right-0 w-[1px] h-2 bg-slate-600" />

      {/* Title Bar */}
      {title && (
        <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mb-1">
              {subtitle || "COGNITIVE MODULE"}
            </span>
            <h3 className={`text-xs font-semibold uppercase tracking-tactical font-mono ${textColors[activeStatusColor]}`}>
              {title}
            </h3>
          </div>
          <span className="text-[9px] text-slate-600 font-mono tracking-wider">
            {statusText || cornerIndicator}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 text-xs text-slate-300 font-mono">
        {children}
      </div>

      {/* Scanline Sweep Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-gradient-to-b from-primary via-transparent to-primary bg-[length:100%_20px]" />
    </motion.div>
  );
};

export default TacticalHudCard;
