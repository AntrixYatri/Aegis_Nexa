import React from 'react';

interface HistoricalAnalyticsProps {
    data?: {
        risk_score: string;
        total_historical_incidents: number;
        top_historical_cause: string;
        incident_breakdown: Record<string, number>;
        priority_breakdown: Record<string, number>;
    };
}

export const TimelineAnalytics: React.FC<HistoricalAnalyticsProps> = ({ data }) => {
    if (!data) {
        return (
            <div className="text-[#4b5563] text-xs font-mono tracking-wider p-4 uppercase">
                [ SYSTEM IDLE — AWAITING EVENT PARAMETER INGESTION ]
            </div>
        );
    }

    // Choose a color theme matching the dynamic risk score
    const scoreColors: Record<string, string> = {
        CRITICAL: "text-red-500 border-red-500 bg-red-950/20",
        HIGH: "text-orange-500 border-orange-500 bg-orange-950/20",
        MEDIUM: "text-yellow-500 border-yellow-500 bg-yellow-950/20",
        LOW: "text-green-500 border-green-500 bg-green-950/20"
    };

    return (
        <div className="border border-[#1e293b] bg-[#050507] p-4 text-xs font-mono uppercase tracking-wider text-slate-300">
            <div className="mb-3 flex justify-between items-center border-b border-[#1e293b] pb-2">
                <span className="text-cyan-400 font-bold">// ASTRAM HISTORICAL AUTOPSY</span>
                <span className={`border px-2 py-0.5 text-[10px] font-black ${scoreColors[data.risk_score] || 'text-slate-400'}`}>
                    ZONE RISK: {data.risk_score}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-[#09090b] p-2 border border-[#1e293b]">
                    <span className="text-slate-500 text-[10px] block">TOTAL HISTORICAL INCIDENTS</span>
                    <span className="text-lg text-white font-bold">{data.total_historical_incidents}</span>
                </div>
                <div className="bg-[#09090b] p-2 border border-[#1e293b]">
                    <span className="text-slate-500 text-[10px] block">PRIMARY CRITICAL ROOT-CAUSE</span>
                    <span className="text-white font-bold truncate block">{data.top_historical_cause}</span>
                </div>
            </div>

            <div className="text-[10px] text-cyan-500/80 mb-1 font-bold">INCIDENT FREQUENCY BREAKDOWN</div>
            <table className="w-full text-left border-collapse">
                <tbody>
                    {Object.entries(data.incident_breakdown).map(([cause, count]) => (
                        <tr key={cause} className="border-b border-[#0f172a] hover:bg-slate-900/40">
                            <td className="py-1 text-slate-400 font-medium">{cause.replace('_', ' ')}</td>
                            <td className="py-1 text-right text-white font-bold">{count}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};