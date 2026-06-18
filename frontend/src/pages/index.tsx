import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { TacticalHudCard } from '../components/TacticalHudCard';

// Dynamically import MapContainer with SSR disabled to prevent Server-Side Pre-rendering issues
const MapContainer = dynamic(() => import('../map/MapContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#050507] border border-slate-900 flex flex-col items-center justify-center font-mono text-cyan-400 text-xs tracking-widest animate-pulse">
      <div className="w-8 h-8 border border-cyan-400 border-t-transparent animate-spin mb-3 rounded-none" />
      INITIALIZING MAP VECTOR CORE...
    </div>
  )
});

interface Incident {
  event_type: string;
  latitude: number;
  longitude: number;
  severity: number;
  crowd_size: number;
  duration: number;
  id?: string;
}

interface LogMessage {
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'success' | 'critical';
}

const PRESETS = [
  { id: 'p1', name: 'IPL MATCH', event_type: 'IPL Match', latitude: 12.9788, longitude: 77.5996, severity: 9, crowd_size: 45000, duration: 240, desc: 'Chinnaswamy Stadium' },
  { id: 'p2', name: 'WATERLOGGING', event_type: 'Waterlogging', latitude: 12.9176, longitude: 77.6226, severity: 8, crowd_size: 2000, duration: 180, desc: 'Silk Board Junction' },
  { id: 'p3', name: 'SIGNAL FAILURE', event_type: 'Signal Failure', latitude: 13.0359, longitude: 77.5920, severity: 6, crowd_size: 500, duration: 60, desc: 'Hebbal Flyover' },
  { id: 'p4', name: 'VIP MOVEMENT', event_type: 'VIP Movement', latitude: 12.9740, longitude: 77.6066, severity: 7, crowd_size: 300, duration: 45, desc: 'MG Road Corridor' },
  { id: 'p5', name: 'POLITICAL RALLY', event_type: 'Political Rally', latitude: 12.9796, longitude: 77.5844, severity: 7, crowd_size: 10000, duration: 120, desc: 'Freedom Park' },
  { id: 'p6', name: 'ACCIDENT', event_type: 'Accident', latitude: 12.9642, longitude: 77.5855, severity: 5, crowd_size: 100, duration: 90, desc: 'Town Hall Square' }
];

export default function CommandCenter() {
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [activeIncidentsList, setActiveIncidentsList] = useState<Incident[]>([]);
  const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);

  // Custom Incident Creation forms
  const [customForm, setCustomForm] = useState<Incident>({
    event_type: 'Protest',
    latitude: 12.9716,
    longitude: 77.5946,
    severity: 5,
    crowd_size: 1500,
    duration: 120
  });

  // API response parameters
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [dispatchData, setDispatchData] = useState<any>(null);
  const [deploymentState, setDeploymentState] = useState<'IDLE' | 'PENDING' | 'DISPATCHED' | 'ACTIVE'>('IDLE');

  // Interface details
  const [dispatchTab, setDispatchTab] = useState<'en' | 'kn'>('en');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [latency, setLatency] = useState(12);
  const [timeStr, setTimeStr] = useState('');
  const [backendStatus, setBackendStatus] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
  const [isLlmLoading, setIsLlmLoading] = useState(false);

  // Terminal stream console logs
  const [logs, setLogs] = useState<LogMessage[]>([
    { timestamp: '23:51:05', message: 'AuraOS Core initialized. Bengaluru Command Network standby.', type: 'info' },
    { timestamp: '23:51:06', message: 'ST-GNN model loaded successfully. Road vector topology mapped.', type: 'success' }
  ]);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const pushLog = (msg: string, type: LogMessage['type'] = 'info') => {
    const ts = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [...prev, { timestamp: ts, message: msg, type }]);
  };



  // Live status indicators
  useEffect(() => {
    const timeInterval = setInterval(() => {
      const d = new Date();
      setTimeStr(d.toISOString().replace('T', ' // ').substring(0, 22));
    }, 1000);

    const latencyInterval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 8) + 10);
    }, 3000);

    // Initial check connectivity
    fetch('http://localhost:8000/')
      .then(() => setBackendStatus('ONLINE'))
      .catch(() => setBackendStatus('OFFLINE'));

    return () => {
      clearInterval(timeInterval);
      clearInterval(latencyInterval);
    };
  }, []);

  // Run simulation & predictions
  const runSimulation = async (incident: Incident) => {
    setPhase(2);
    setDeploymentState('PENDING');
    setIsLlmLoading(true);
    pushLog(`[INFO] Triggering spatiotemporal ST-GNN simulation at lat: ${incident.latitude}, lng: ${incident.longitude}`, 'info');

    try {
      const response = await fetch('http://localhost:8000/api/v1/simulate-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: incident.event_type,
          latitude: incident.latitude,
          longitude: incident.longitude,
          severity: incident.severity
        })
      });

      if (!response.ok) {
        throw new Error(`ST-GNN Simulation API failed with status ${response.status}`);
      }

      const simData = await response.json();
      setSimulationResult(simData);
      pushLog(`[SUCCESS] ST-GNN projection generated. Impacted nodes: ${simData.impacted_nodes.length}, Risk Radius: ${simData.blast_radius_meters}m`, 'success');
      pushLog(`[SUCCESS] Risk topology mapped.`, 'success');
      pushLog(`[SUCCESS] Impact radius visualized.`, 'success');
      pushLog(`[INFO] Quarantine perimeter generated.`, 'info');

      // Request Dispatch orders
      pushLog(`[INFO] Sending payload to Gemini Intelligence Core...`, 'info');
      const dispatchResponse = await fetch('http://localhost:8000/api/v1/dispatch-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: incident.event_type,
          latitude: incident.latitude,
          longitude: incident.longitude,
          severity: incident.severity
        })
      });

      if (!dispatchResponse.ok) {
        throw new Error(`Dispatch Orders API failed with status ${dispatchResponse.status}`);
      }

      const orderData = await dispatchResponse.json();
      setDispatchData(orderData.intelligence_output);
      setDeploymentState('DISPATCHED');
      pushLog(`[SUCCESS] BTP Radio Dispatch generated and broadcasted to local precinct.`, 'success');
      setBackendStatus('ONLINE');
    } catch (err: any) {
      console.warn(err);
      pushLog(`[WARN] Backend offline or blocked (${err.message || 'connection failed'}). Running local predictive simulation...`, 'warn');
      setBackendStatus('OFFLINE');

      // Calculate mock fallback parameters locally to ensure 100% frontend operational capability
      const mockRadius = incident.severity * 150;
      const mockNodes = Array.from({ length: incident.severity }).map((_, i) => 100000 + i * 23);
      const mockDetours: [number, number][] = [
        [incident.longitude + 0.002, incident.latitude + 0.002],
        [incident.longitude + 0.004, incident.latitude - 0.001],
        [incident.longitude - 0.001, incident.latitude - 0.003]
      ];

      setSimulationResult({
        status: 'success',
        blast_radius_meters: mockRadius,
        impacted_nodes: mockNodes,
        detour_geometry: mockDetours
      });

      // Local Gemini SOP Dispatch fallback
      const mockDispatch = {
        action_plan_english: `[LOCAL FALLBACK] Priority ${incident.severity} ${incident.event_type} event active at lat: ${incident.latitude}, lng: ${incident.longitude}. Deploy traffic barricades, clear critical intersections, and redirect Flipkart logistics cargo vehicles along green-corridor detour geometries.`,
        action_plan_kannada: `[ಸ್ಥಳೀಯ ಫಾಲ್‌ಬ್ಯಾಕ್] ಆದ್ಯತೆ {${incident.severity}} ${incident.event_type} ಸಕ್ರಿಯವಾಗಿದೆ. ಸಂಚಾರ ತಡೆಗೋಡೆಗಳನ್ನು ನಿಯೋಜಿಸಿ, ನಿರ್ಣಾಯಕ ಛೇದಕಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ ಮತ್ತು ಫ್ಲಿಪ್ಕಾರ್ಟ್ ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಸರಕು ವಾಹನಗಳನ್ನು ಮರುನಿರ್ದೇಶಿಸಿ.`,
        required_personnel: incident.severity * 2,
        required_barricades: incident.severity
      };

      setDispatchData(mockDispatch);
      setDeploymentState('DISPATCHED');
      pushLog(`[SUCCESS] Local predictive simulation initialized successfully.`, 'success');
      pushLog(`[SUCCESS] Risk topology mapped.`, 'success');
      pushLog(`[SUCCESS] Impact radius visualized.`, 'success');
      pushLog(`[INFO] Quarantine perimeter generated.`, 'info');
    } finally {
      setIsLlmLoading(false);
    }
  };

  // Re-run simulation dynamically if severity/criticality changes
  useEffect(() => {
    if (activeIncident) {
      // Small debounce to avoid hammering the backend on slider drag
      const timeout = setTimeout(() => {
        runSimulation(activeIncident);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [activeIncident?.severity]);

  // Click handler for presets
  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    setIsCustomMode(false);
    const incidentData: Incident = {
      event_type: preset.event_type,
      latitude: preset.latitude,
      longitude: preset.longitude,
      severity: preset.severity,
      crowd_size: preset.crowd_size,
      duration: preset.duration,
      id: preset.id
    };

    setActiveIncident(incidentData);
    setCustomForm(incidentData);
    setExpandedIncidentId(preset.id);

    // Add to Active Incident Rails
    if (!activeIncidentsList.some((x) => x.id === preset.id)) {
      setActiveIncidentsList((prev) => [incidentData, ...prev]);
    }

    pushLog(`[INFO] Preset incident activated: ${preset.name}`, 'info');
    pushLog(`[INFO] Incident marker deployed.`, 'info');
    runSimulation(incidentData);
  };

  // Handle custom incident submission
  const handleSimulateCustom = () => {
    const customIncident: Incident = {
      ...customForm,
      id: `custom-${Date.now()}`
    };
    setActiveIncident(customIncident);
    setExpandedIncidentId(customIncident.id || null);
    setActiveIncidentsList((prev) => [customIncident, ...prev]);
    pushLog(`[INFO] Custom incident created: ${customForm.event_type}`, 'info');
    pushLog(`[INFO] Incident marker deployed.`, 'info');
    runSimulation(customIncident);
  };

  // Handle barriade and logistics corridor deployment
  const handleDeployInterventions = () => {
    setPhase(3);
    setDeploymentState('ACTIVE');
    pushLog(`[WARN] Mitigating risk nodes... Deploying barricades & dispatching tow units.`, 'warn');
    pushLog(`[INFO] Streaming Green Corridor webhook token parameters to Flipkart Logistics.`, 'info');

    setTimeout(() => {
      setPhase(4);
      pushLog(`[SUCCESS] Webhook handshake completed. 142 fleet cargo vans deflected dynamically.`, 'success');
    }, 2000);
  };

  // Remove/Disable incident from active rail
  const handleDisableIncident = (id: string) => {
    setActiveIncidentsList((prev) => prev.filter((x) => x.id !== id));
    if (activeIncident?.id === id) {
      setActiveIncident(null);
      setSimulationResult(null);
      setDispatchData(null);
      setDeploymentState('IDLE');
      setPhase(1);
      pushLog(`[INFO] Active incident cleared from Command simulator.`, 'info');
    }
  };

  // Edit incident
  const handleEditIncident = (incident: Incident) => {
    setCustomForm(incident);
    setIsCustomMode(true);
    pushLog(`[INFO] Incident parameters loaded into custom editor.`, 'info');
  };

  // Render chronological progression timeline
  const getTimelineEvents = () => {
    const events: Array<{ time: string; label: string; active: boolean }> = [];
    if (activeIncident) {
      events.push({ time: '00:01', label: 'Incident Created', active: !!activeIncident });
      events.push({ time: '00:02', label: 'ST-GNN Triggered', active: phase >= 2 });
      events.push({ time: '00:03', label: 'Prediction Generated', active: phase >= 2 && !!simulationResult });
      events.push({ time: '00:04', label: 'Gemini SOP Generated', active: phase >= 2 && !!dispatchData });
      events.push({ time: '00:05', label: 'Mitigation Deployed', active: phase >= 3 });
      events.push({ time: '00:06', label: 'Fleet Rerouted', active: phase >= 4 });
      events.push({ time: '00:07', label: 'Congestion Reduced', active: phase >= 4 });
    }
    return events;
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 select-none relative flex flex-col font-mono text-xs overflow-y-auto overflow-x-hidden">
      <Head>
        <title>AEGIS NEXA // COUNTERFACTUAL COMMAND OS</title>
      </Head>

      {/* SYSTEM STATUS BAR */}
      <header className="w-full border-b border-slate-900 bg-black/90 px-4 py-2 flex justify-between items-center z-50 shrink-0 h-10">
        <div className="flex items-center space-x-3">
          <span className="text-[#00e5ff] font-mono tracking-widest text-xs font-black animate-pulse">武士</span>
          <div className="h-4 w-[1px] bg-slate-800" />
          <h1 className="font-mono text-xs tracking-[0.2em] font-bold text-slate-400">
            AEGIS NEXA // <span className="text-slate-200">COUNTERFACTUAL COMMAND OS</span>
          </h1>
        </div>
        <div className="flex items-center space-x-4 text-[10px] text-slate-500">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-none bg-emerald-400" />
            <span>ST-GNN: ONLINE</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-none bg-emerald-400" />
            <span>GEMINI: READY</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className={`w-1.5 h-1.5 rounded-none ${backendStatus === 'ONLINE' ? 'bg-emerald-400' : 'bg-red-500 animate-pulse'}`} />
            <span>BACKEND: {backendStatus}</span>
          </div>
          <div className="h-3 w-[1px] bg-slate-800" />
          <span>SYS_LATENCY: {latency}ms</span>
          <div className="h-3 w-[1px] bg-slate-800" />
          <span className="text-cyan-400 font-bold">{timeStr || 'LIVE'}</span>
        </div>
      </header>

      {/* INCIDENT PRESETS CARDS (NO DROPDOWNS) */}
      <section className="w-full bg-[#050507] border-b border-slate-900 px-4 py-2.5 flex items-center space-x-3 shrink-0 z-40">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">// INCIDENT PRESETS:</span>
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none flex-1">
          {PRESETS.map((p) => {
            const isActive = activeIncident?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`px-3 py-1.5 border rounded-none transition-all duration-150 text-[10px] font-bold tracking-wider uppercase flex items-center space-x-2 shrink-0 ${isActive
                    ? 'border-[#00e5ff] bg-cyan-950/20 text-[#00e5ff]'
                    : 'border-slate-800 bg-black text-slate-400 hover:border-slate-600 hover:text-slate-200'
                  }`}
              >
                <span>[{p.name}]</span>
                <span className="text-[8px] text-slate-600">({p.desc})</span>
              </button>
            );
          })}

          {/* Custom Trigger */}
          <button
            onClick={() => setIsCustomMode(!isCustomMode)}
            className={`px-3 py-1.5 border rounded-none transition-all duration-150 text-[10px] font-bold tracking-wider uppercase shrink-0 ${isCustomMode
                ? 'border-yellow-500 bg-yellow-950/10 text-yellow-500'
                : 'border-slate-800 bg-black text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
          >
            [+ CUSTOM CREATOR]
          </button>
        </div>
      </section>

      {/* MAIN WORKSPACE: THREE-COLUMN TACTICAL VIEW */}
      <main className="w-full flex flex-col lg:flex-row gap-4 p-4 min-h-0 flex-1">

        {/* Column 1: Incident Controls (Left) - occupies 20% width */}
        <section className="w-full lg:w-[20%] flex flex-col shrink-0 select-text">
          <TacticalHudCard
            title="INCIDENT CONTROLS"
            subtitle="SCENARIO BUILDER"
            statusColor={isCustomMode ? "alert" : "primary"}
            cornerIndicator="OP//CTRL"
          >
            {isCustomMode ? (
              <div className="space-y-3.5 text-[10px] flex flex-col h-full justify-between">
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Incident Type</label>
                    <input
                      type="text"
                      value={customForm.event_type}
                      onChange={(e) => setCustomForm({ ...customForm, event_type: e.target.value })}
                      className="w-full rounded-none bg-black border border-slate-800 p-1.5 text-slate-200 outline-none focus:border-[#00e5ff] transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={customForm.latitude}
                        onChange={(e) => setCustomForm({ ...customForm, latitude: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-none bg-black border border-slate-800 p-1.5 text-slate-200 outline-none focus:border-[#00e5ff] transition"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={customForm.longitude}
                        onChange={(e) => setCustomForm({ ...customForm, longitude: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-none bg-black border border-slate-800 p-1.5 text-slate-200 outline-none focus:border-[#00e5ff] transition"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Duration (m)</label>
                      <input
                        type="number"
                        value={customForm.duration}
                        onChange={(e) => setCustomForm({ ...customForm, duration: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-none bg-black border border-slate-800 p-1.5 text-slate-200 outline-none focus:border-[#00e5ff] transition"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Crowd Size</label>
                      <input
                        type="number"
                        value={customForm.crowd_size}
                        onChange={(e) => setCustomForm({ ...customForm, crowd_size: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-none bg-black border border-slate-800 p-1.5 text-slate-200 outline-none focus:border-[#00e5ff] transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Severity Index ({customForm.severity}/10)</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={customForm.severity}
                      onChange={(e) => setCustomForm({ ...customForm, severity: parseInt(e.target.value) || 1 })}
                      className="w-full accent-[#00e5ff] bg-slate-900 h-1 outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSimulateCustom}
                  className="w-full py-2 bg-yellow-950/20 border border-yellow-500/60 hover:bg-yellow-500 hover:text-black transition text-yellow-500 font-bold uppercase tracking-widest text-[9px] mt-2 rounded-none"
                >
                  SIMULATE CUSTOM VECTOR
                </button>
              </div>
            ) : (
              <div className="flex flex-col h-full justify-between space-y-4">
                <div className="space-y-3 text-[10px]">
                  <span className="text-[10px] uppercase font-bold text-[#00e5ff] tracking-wider block">// ACTIVE PRESET DATA</span>
                  {activeIncident ? (
                    <div className="space-y-2 border border-slate-900 p-2.5 bg-black/40">
                      <div className="flex justify-between border-b border-slate-950 pb-1">
                        <span className="text-slate-500">EVENT TYPE:</span>
                        <span className="text-slate-200 font-bold uppercase">{activeIncident.event_type}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-950 pb-1">
                        <span className="text-slate-500">LATENCY COORDS:</span>
                        <span className="text-slate-300 font-mono">{activeIncident.latitude.toFixed(4)}, {activeIncident.longitude.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-950 pb-1">
                        <span className="text-slate-500">CROWD VOLUME:</span>
                        <span className="text-slate-300">{activeIncident.crowd_size.toLocaleString()} PPL</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-950 pb-1">
                        <span className="text-slate-500">DURATION PROJ:</span>
                        <span className="text-slate-300">{activeIncident.duration} MINS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">CRITICALITY LEVEL:</span>
                        <span className="text-red-400 font-black">{activeIncident.severity}/10</span>
                      </div>
                      <div className="pt-2">
                        <label className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1">Adjust Severity</label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={activeIncident.severity}
                          onChange={(e) => setActiveIncident({ ...activeIncident, severity: parseInt(e.target.value) || 1 })}
                          className="w-full accent-[#00e5ff] bg-slate-900 h-1 outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-500 leading-relaxed">
                      Select an incident preset above to load spatial coordinate overlays into the simulator or click "+ CUSTOM CREATOR" to build a bespoke threat model.
                    </p>
                  )}
                </div>

                <div className="border border-slate-900/60 p-2 bg-[#050507] text-[9px] text-slate-500 leading-relaxed uppercase">
                  <span>SYSTEM OVERRIDE READY. PRESET SELECTION FORWARDED TO SPATIOTEMPORAL GRAPH CORE.</span>
                </div>
              </div>
            )}
          </TacticalHudCard>
        </section>

        {/* Column 2: Map Area (Middle) - occupies 60% width */}
        <section className="w-full lg:w-[60%] flex flex-col relative border border-slate-800 bg-[#050507] shrink-0 h-[400px] lg:h-[550px]">
          <MapContainer
            simulationPhase={phase}
            activeIncident={activeIncident}
            simulationResult={simulationResult}
            onLogMessage={pushLog}
          />
          <div className="absolute inset-0 pointer-events-none hud-scanline opacity-[0.15] z-20" />
        </section>

        {/* Column 3: Active Threats & Timeline (Right) - occupies 20% width */}
        <section className="w-full lg:w-[20%] flex flex-col gap-4 shrink-0 select-text">
          {/* Active Incidents panel */}
          <TacticalHudCard title="ACTIVE THREAT MONITORS" subtitle="OPERATIONAL INSTANCES" statusColor="danger" cornerIndicator="TH//ACT">
            <div className="space-y-3">
              {activeIncidentsList.length === 0 ? (
                <div className="text-center text-[10px] text-slate-600 py-6 uppercase font-bold">
                  NO ACTIVE SCENARIOS
                </div>
              ) : (
                activeIncidentsList.map((inc) => {
                  const isExpanded = expandedIncidentId === inc.id;
                  const isSimulatorTarget = activeIncident?.id === inc.id;

                  return (
                    <div key={inc.id} className={`border ${isSimulatorTarget ? 'border-[#00e5ff]/50' : 'border-slate-800'} p-2.5 bg-[#050507]`}>
                      <div
                        onClick={() => setExpandedIncidentId(isExpanded ? null : (inc.id || null))}
                        className="flex justify-between items-center cursor-pointer text-[10px]"
                      >
                        <span className="font-bold text-slate-300 uppercase">
                          {isExpanded ? '▼' : '▶'} {inc.event_type}
                        </span>
                        {isSimulatorTarget && (
                          <span className="text-[8px] bg-cyan-950 text-[#00e5ff] px-1 font-bold">SIM ACTIVE</span>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 border-t border-slate-900 pt-2 text-[10px] text-slate-400">
                          <div className="flex justify-between">
                            <span>SEVERITY INDEX:</span>
                            <span className="text-red-400 font-bold">{inc.severity}/10</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CROWD MATRIX:</span>
                            <span>{inc.crowd_size.toLocaleString()} PPL</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SHADOW RADIUS:</span>
                            <span>{inc.severity * 150}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span>COGNITIVE NODES:</span>
                            <span>{simulationResult?.impacted_nodes?.length || 0} intersections</span>
                          </div>

                          {/* Actions */}
                          <div className="flex space-x-2 pt-2 border-t border-slate-900">
                            <button
                              onClick={() => handleEditIncident(inc)}
                              className="flex-1 py-1 border border-slate-700 bg-black text-slate-300 font-bold text-[9px] hover:border-slate-500 text-center"
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() => handleDisableIncident(inc.id || '')}
                              className="flex-1 py-1 border border-red-900 bg-black text-red-400 font-bold text-[9px] hover:border-red-600 text-center"
                            >
                              DISABLE
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TacticalHudCard>

          {/* Chronological events timeline */}
          <TacticalHudCard title="SIMULATION CHRONOLOGY" subtitle="ST-GNN PIPELINE STAGES" statusColor="primary" cornerIndicator="TM//CHRON">
            <div className="space-y-4 relative pl-3 border-l border-slate-800 text-[10px]">
              {getTimelineEvents().length === 0 ? (
                <div className="text-slate-600 text-[9px] py-4 uppercase">
                  Awaiting incident initialization...
                </div>
              ) : (
                getTimelineEvents().map((ev, idx) => (
                  <div key={idx} className="relative mb-2">
                    <span className={`absolute -left-[16px] top-1 w-2 h-2 rounded-none ${ev.active ? 'bg-cyan-400 glow-cyan' : 'bg-slate-800'}`} />
                    <div className="flex justify-between">
                      <span className={ev.active ? 'text-slate-200 font-bold' : 'text-slate-600'}>
                        {ev.label}
                      </span>
                      <span className="text-[8px] text-slate-500">{ev.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TacticalHudCard>
        </section>

      </main>

      {/* BOTTOM FOUR-COLUMN PANEL BLOCK */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 select-text">

        {/* Column 1: Forecast */}
        <TacticalHudCard title="SPATIOTEMPORAL FORECAST" subtitle="[02] ST-GNN ANALYTICS" statusColor="primary" cornerIndicator="OP//02">
          <div className="flex flex-col h-full justify-between min-h-[160px]">
            <div>
              {activeIncident && simulationResult ? (
                <div className="space-y-2 text-[10px]">
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">BASELINE DELAY:</span>
                    <span className="text-slate-300 font-bold">{activeIncident.severity * 11 + 8} mins</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">PREDICTED DELAY:</span>
                    <span className="text-emerald-400 font-bold">{Math.round(activeIncident.severity * 3.5 + 3)} mins</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">RISK AURA RADIUS:</span>
                    <span className="text-slate-300 font-bold">{simulationResult.blast_radius_meters} Meters</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1">
                    <span className="text-slate-500">IMPACTED OSM NODES:</span>
                    <span className="text-slate-300 font-bold">{simulationResult.impacted_nodes.length} intersections</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MODEL CONFIDENCE:</span>
                    <span className="text-cyan-400 font-bold">98.42%</span>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-600 text-center py-8">
                  AWAITING SIMULATION CORE DATA...
                </div>
              )}
            </div>

            {phase === 2 && activeIncident && (
              <button
                onClick={handleDeployInterventions}
                className="w-full py-2 bg-red-950/20 border border-red-500 text-red-500 font-bold hover:bg-red-500 hover:text-black transition uppercase tracking-wider text-[9px] animate-pulse rounded-none mt-4"
              >
                DEPLOY BARRICADES & DIVERT FLOW
              </button>
            )}
          </div>
        </TacticalHudCard>

        {/* Column 2: Gemini SOP */}
        <TacticalHudCard title="GEMINI SOP DISPATCH" subtitle="[03] INTELLIGENCE PROTOCOLS" statusColor="primary" cornerIndicator="OP//03">
          <div className="flex flex-col h-full justify-between min-h-[160px]">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">LANG BROADCAST RELAYS</span>
              {dispatchData && (
                <div className="flex space-x-1">
                  <button
                    onClick={() => setDispatchTab('en')}
                    className={`px-1.5 py-0.5 text-[8px] font-bold border rounded-none transition ${dispatchTab === 'en' ? 'border-[#00e5ff] text-[#00e5ff] bg-cyan-950/20' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setDispatchTab('kn')}
                    className={`px-1.5 py-0.5 text-[8px] font-bold border rounded-none transition ${dispatchTab === 'kn' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    KN
                  </button>
                </div>
              )}
            </div>

            {isLlmLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                <div className="w-5 h-5 border border-cyan-400 border-t-transparent animate-spin mb-2 rounded-none" />
                <span className="text-[9px] text-[#00e5ff] uppercase tracking-wider animate-pulse">SYNTHESIZING SOP VIA GEMINI...</span>
              </div>
            ) : dispatchData ? (
              <div className="flex-1 flex flex-col justify-between text-[9.5px] space-y-2">
                <div className="bg-black/60 border border-slate-900 p-2 overflow-y-auto max-h-[85px] scrollbar-thin flex-1 text-slate-300">
                  {dispatchTab === 'en' ? (
                    <p className="leading-relaxed font-mono whitespace-pre-wrap">
                      <span className="text-[#00e5ff] font-bold block mb-0.5">[TACTICAL Relays]</span>
                      {dispatchData.action_plan_english}
                    </p>
                  ) : (
                    <p className="leading-relaxed font-sans whitespace-pre-wrap text-emerald-400/90">
                      <span className="text-emerald-500 font-bold block mb-0.5 font-mono">[ರೇಡಿಯೋ ಆಜ್ಞೆ]</span>
                      {dispatchData.action_plan_kannada}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-900/60 text-[9px] tracking-wider">
                  <div className="flex justify-between">
                    <span className="text-slate-500">COP ALIGN:</span>
                    <span className="text-[#00e5ff] font-bold">{dispatchData.required_personnel} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">BARRICADES:</span>
                    <span className="text-[#00e5ff] font-bold">{dispatchData.required_barricades} units</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-600 text-center py-8">
                AWAITING SOP TRANSMISSION...
              </div>
            )}
          </div>
        </TacticalHudCard>

        {/* Column 3: Impact Analysis */}
        <TacticalHudCard title="CASCADING IMPACT" subtitle="[04] REAL-TIME MITIGATIONS" statusColor="primary" cornerIndicator="OP//04">
          <div className="flex flex-col h-full justify-between min-h-[160px]">
            {activeIncident && phase >= 3 ? (
              <div className="space-y-2.5 text-[10px] flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/50 border border-slate-900 p-2 text-center flex flex-col justify-between">
                    <span className="text-[8px] text-slate-500 uppercase block tracking-wider leading-none mb-1">DELAY REDUCTION</span>
                    <span className="text-sm font-black text-emerald-400 font-mono leading-none">
                      -{activeIncident.severity * 11 + 8 - Math.round(activeIncident.severity * 3.5 + 3)}m
                    </span>
                  </div>
                  <div className="bg-black/50 border border-slate-900 p-2 text-center flex flex-col justify-between">
                    <span className="text-[8px] text-slate-500 uppercase block tracking-wider leading-none mb-1">SATURATION DROP</span>
                    <span className="text-sm font-black text-emerald-400 font-mono leading-none">
                      -64.8%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/50 border border-slate-900 p-2 text-center flex flex-col justify-between">
                    <span className="text-[8px] text-slate-500 uppercase block tracking-wider leading-none mb-1">VELOCITY GAIN</span>
                    <span className="text-sm font-black text-cyan-400 font-mono leading-none">
                      +38%
                    </span>
                  </div>
                  <div className="bg-black/50 border border-slate-900 p-2 text-center flex flex-col justify-between">
                    <span className="text-[8px] text-slate-500 uppercase block tracking-wider leading-none mb-1">MITIGATED NODES</span>
                    <span className="text-sm font-black text-cyan-400 font-mono leading-none">
                      {simulationResult?.impacted_nodes?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-600 text-center py-8">
                AWAITING MITIGATION DEPLOYMENT...
              </div>
            )}
          </div>
        </TacticalHudCard>

        {/* Column 4: Fleet Status */}
        <TacticalHudCard title="FLEET ROUTING STATUS" subtitle="[05] LOGISTICS TELEMETRY" statusColor={phase >= 3 ? "success" : "primary"} cornerIndicator="OP//05">
          <div className="flex flex-col h-full justify-between min-h-[160px] text-[10px]">
            {activeIncident ? (
              <div className="space-y-2.5 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5 border border-slate-900 p-2.5 bg-black/40">
                  <div className="flex justify-between border-b border-slate-950 pb-1">
                    <span className="text-slate-500">FLEET STATE:</span>
                    <span className={`font-bold ${phase >= 3 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
                      {phase >= 3 ? 'REROUTED // CORRIDOR ON' : 'STANDBY // NORMAL ROUTES'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-950 pb-1">
                    <span className="text-slate-500">WEBHOOK HANDSHAKE:</span>
                    <span className={`font-mono ${phase >= 3 ? 'text-[#00e5ff]' : 'text-slate-500'}`}>
                      {phase >= 3 ? 'SECURE_FK_NET_TOKEN' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">FLEET DEFLECTIONS:</span>
                    <span className={`font-bold ${phase >= 3 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {phase >= 3 ? '142 CARGO VANS' : '0 VANS'}
                    </span>
                  </div>
                </div>

                {/* Scrollable Vehicle list */}
                <div className="bg-black/60 border border-slate-900 p-1.5 h-[55px] overflow-y-auto scrollbar-thin text-[8.5px] font-mono text-slate-400 space-y-1">
                  {phase >= 3 ? (
                    <>
                      <div className="flex justify-between text-emerald-400">
                        <span>&gt; FK-TRUCK-582</span>
                        <span>DETOUR // OK</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>&gt; FK-TRUCK-192</span>
                        <span>DETOUR // OK</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>&gt; FK-TRUCK-482</span>
                        <span>DETOUR // OK</span>
                      </div>
                      <div className="flex justify-between text-cyan-400">
                        <span>&gt; FK-TRUCK-901</span>
                        <span>REROUTING...</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-slate-600">&gt; Telemetry online.</div>
                      <div className="text-slate-600">&gt; Awaiting spatiotemporal trigger...</div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-600 text-center py-8">
                AWAITING ROUTING METRICS...
              </div>
            )}
          </div>
        </TacticalHudCard>

      </section>

      {/* PERSISTENT TERMINAL STREAM */}
      <section className="w-full bg-black border-t border-slate-900 flex flex-col h-48 shrink-0 select-text relative mt-4">
        {/* Terminal Header */}
        <div className="flex justify-between items-center border-b border-slate-950 bg-slate-950 px-4 py-1.5 shrink-0 h-7">
          <span className="text-slate-500 uppercase tracking-widest text-[8.5px] font-bold">
            AuraOS Core v1.0.0 // SPATIOTEMPORAL SIMULATION STREAM
          </span>
          <button
            onClick={() => setLogs([
              { timestamp: new Date().toTimeString().split(' ')[0], message: 'Logs flushed. Terminal Core monitoring standby.', type: 'info' }
            ])}
            className="text-slate-600 hover:text-slate-400 uppercase tracking-wider text-[8px] border border-slate-900 px-2 hover:border-slate-700 transition rounded-none bg-black"
          >
            Flush Canvas
          </button>
        </div>

        {/* Terminal Console Logs */}
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1.5 scrollbar-thin select-text">
          {logs.map((log, idx) => {
            let textColor = 'text-slate-400';
            if (log.type === 'warn') textColor = 'text-yellow-500';
            if (log.type === 'critical') textColor = 'text-red-500 font-semibold animate-pulse';
            if (log.type === 'success') textColor = 'text-emerald-400';

            return (
              <div key={idx} className="flex gap-3 items-start leading-relaxed text-[10px] font-mono select-text">
                <span className="text-slate-600 font-light select-none whitespace-nowrap">
                  [{log.timestamp}]
                </span>
                <span className={`${textColor} whitespace-pre-wrap flex-1 select-text`}>
                  {log.message}
                </span>
              </div>
            );
          })}
          <div ref={terminalEndRef} />
        </div>
      </section>
    </div>
  );
}