import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function ControlDeck() {
  const [simulationState, setSimulationState] = useState('STANDBY');

  const handleInitialize = () => {
    setSimulationState('SCANNING');
    // Simulate backend calculation delay
    setTimeout(() => setSimulationState('BREACH_DETECTED'), 2000);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#050507] text-gray-300 border-[1px] border-cyan-400/30 p-4 font-mono rounded-none">
      <div className="flex justify-between items-center mb-6 border-b-[1px] border-cyan-400/30 pb-2">
        <h2 className="text-cyan-400 text-lg tracking-widest uppercase font-bold">Command Link</h2>
        <span className="text-xs text-cyan-700 animate-pulse">LIVE OPLINK</span>
      </div>

      {/* Phase 1: Event Initialization */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-2 uppercase">Target Event Vector</p>
        <select className="w-full bg-black border-[1px] border-gray-800 text-gray-200 p-2 mb-4 outline-none focus:border-cyan-400 transition-colors rounded-none">
          <option>IPL Match @ Chinnaswamy Stadium</option>
          <option>Political Rally @ Freedom Park</option>
          <option>Flash Protest @ Town Hall</option>
        </select>
        
        <button 
          onClick={handleInitialize}
          className="w-full bg-cyan-900/20 border-[1px] border-cyan-400 text-cyan-400 py-2 uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all rounded-none"
        >
          {simulationState === 'STANDBY' ? 'Initialize Simulation' : 'Calculating Topography...'}
        </button>
      </div>

      {/* Phase 2: Vulnerability Topography (Only shows when breach detected) */}
      {simulationState === 'BREACH_DETECTED' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          {/* Resource Bill of Materials */}
          <div className="border-[1px] border-red-950/40 bg-red-950/10 p-3">
            <h3 className="text-red-500 text-sm font-bold mb-2 uppercase">Resource Matrix Required</h3>
            <ul className="text-xs text-red-400/80 space-y-1">
              <li>&gt; 40x Barricades @ MG Road Junction</li>
              <li>&gt; 03x Tow Trucks @ Webbs Junction</li>
              <li>&gt; 12x Constables @ Rapid Deploy</li>
            </ul>
          </div>

          {/* VMS Drafts */}
          <div className="border-[1px] border-emerald-900/40 bg-emerald-900/10 p-3">
            <h3 className="text-emerald-400 text-sm font-bold mb-2 uppercase">Automated VMS Drafts</h3>
            <div className="text-xs text-emerald-300/80 mb-2 font-sans bg-black p-2 border-[1px] border-emerald-900/50">
              HEAVY CONGESTION: CHINNASWAMY EVENT. CV REROUTE VIA ORR.
            </div>
            <div className="text-xs text-emerald-300/80 font-sans bg-black p-2 border-[1px] border-emerald-900/50">
              ಭಾರೀ ಟ್ರಾಫಿಕ್: ಚಿನ್ನಸ್ವಾಮಿ ಪಂದ್ಯ. ಭಾರಿ ವಾಹನಗಳು ORR ಮೂಲಕ ಸಂಚರಿಸಿ.
            </div>
          </div>

          {/* Action Trigger */}
          <button className="w-full bg-red-900/20 border-[1px] border-red-500 text-red-500 py-3 mt-4 uppercase tracking-widest hover:bg-red-500 hover:text-black transition-all rounded-none font-bold">
            Deploy Barricades & Divert Flow
          </button>
        </motion.div>
      )}
    </div>
  );
}