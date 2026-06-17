import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Extracted from historical Astram dataset mocks
const HISTORICAL_FAILURE_DATA = [
  { time: 'T-60', failRate: 10, volume: 400 },
  { time: 'T-45', failRate: 25, volume: 650 },
  { time: 'T-30', failRate: 45, volume: 900 },
  { time: 'T-15', failRate: 85, volume: 1200 }, // Critical Breach Point
  { time: 'T-00', failRate: 95, volume: 1400 },
  { time: 'T+15', failRate: 60, volume: 1100 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black border-[1px] border-red-900/50 p-2 font-mono text-xs">
        <p className="text-gray-400 mb-1">INTERVAL: {label}</p>
        <p className="text-red-500">GRID COLLAPSE: {payload[0].value}%</p>
        <p className="text-cyan-500">VEHICLE VOL: {payload[1].value}</p>
      </div>
    );
  }
  return null;
};

export default function AutopsyChart() {
  return (
    <div className="w-full h-48 bg-[#050507] border-[1px] border-gray-800 p-3 mt-4 rounded-none font-mono">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest">Historical Autopsy</h3>
        <span className="text-[10px] text-red-500/80">ASTRAM: CHINNASWAMY_NODE</span>
      </div>
      
      <div className="w-full h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={HISTORICAL_FAILURE_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#4b5563" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              yAxisId="left" 
              stroke="#4b5563" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#374151', strokeWidth: 1 }} />
            
            {/* Grid Collapse Rate Line */}
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="failRate" 
              stroke="#ef4444" 
              strokeWidth={2} 
              dot={{ r: 2, fill: '#ef4444' }} 
              activeDot={{ r: 4, fill: '#ef4444', stroke: '#000' }} 
            />
            
            {/* Traffic Volume Line */}
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="volume" 
              stroke="#06b6d4" 
              strokeWidth={1} 
              strokeDasharray="4 4"
              dot={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}