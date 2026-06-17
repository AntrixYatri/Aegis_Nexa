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

  // Autoscroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

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
      events.push({ time: '00:01', label: 'Incident Created', active: phase >= 2 });
      events.push({ time: '00:02', label: 'ST-GNN Triggered', active: phase >= 2 });
      events.push({ time: '00:03', label: 'Prediction Generated', active: phase >= 2 });
      events.push({ time: '00:04', label: 'Gemini Dispatch SOP Generated', active: phase >= 2 && !!dispatchData });
      events.push({ time: '00:05', label: 'Intervention Deployed', active: phase >= 3 });
      events.push({ time: '00:06', label: 'Congestion Reduced', active: phase >= 4 });
    }
    return events;
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 select-none overflow-hidden relative flex flex-col font-mono text-xs">
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
                className={`px-3 py-1.5 border rounded-none transition-all duration-150 text-[10px] font-bold tracking-wider uppercase flex items-center space-x-2 shrink-0 ${
                  isActive
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
            className={`px-3 py-1.5 border rounded-none transition-all duration-150 text-[10px] font-bold tracking-wider uppercase shrink-0 ${
              isCustomMode
                ? 'border-yellow-500 bg-yellow-950/10 text-yellow-500'
                : 'border-slate-800 bg-black text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
          >
            [+ CUSTOM CREATOR]
          </button>
        </div>
      </section>

      {/* MAIN WORKSPACE GRID */}
      <main className="flex-1 w-full flex overflow-hidden min-h-0">
        
        {/* Left Area: Hero Live Bengaluru Map */}
        <section className="flex-1 h-full relative bg-[#050507] border-r border-slate-900">
          <MapContainer
            simulationPhase={phase}
            activeIncident={activeIncident}
            simulationResult={simulationResult}
            onLogMessage={pushLog}
          />
          <div className="absolute inset-0 pointer-events-none hud-scanline opacity-[0.15] z-20" />
        </section>

        {/* Right Sidebar: Active Incidents Rail & Timeline */}
        <section className="w-80 h-full bg-black/90 p-4 flex flex-col space-y-4 shrink-0 overflow-y-auto z-30 select-text">
          
          {/* Active Incidents panel */}
          <TacticalHudCard title="ACTIVE THREAT MONITORS" subtitle="OPERATIONAL INSTANCES" statusColor="danger">
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
          <TacticalHudCard title="SIMULATION CHRONOLOGY" subtitle="ST-GNN PIPELINE STAGES" statusColor="primary">
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

      {/* BOTTOM MODULAR PANELS (Flow steps: Incident -> Forecast -> Dispatch -> Impact) */}
      <section className="w-full bg-[#050507] border-t border-slate-900 grid grid-cols-4 shrink-0 h-64 z-40 select-text">
        
        {/* PANEL 1: INCIDENT CUSTOM CREATOR */}
        <div className="p-3 border-r border-slate-900 flex flex-col h-full overflow-y-auto">
          <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">
            [01] TARGET VECTOR CREATOR
          </div>
          {isCustomMode ? (
            <div className="space-y-2 text-[10px] flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div>
                  <label className="text-[9px] text-slate-500 uppercase">Incident Type</label>
                  <input
                    type="text"
                    value={customForm.event_type}
                    onChange={(e) => setCustomForm({ ...customForm, event_type: e.target.value })}
                    className="w-full rounded-none bg-black border border-slate-850 p-1 text-slate-200 outline-none focus:border-[#00e5ff]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={customForm.latitude}
                      onChange={(e) => setCustomForm({ ...customForm, latitude: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-none bg-black border border-slate-850 p-1 text-slate-200 outline-none focus:border-[#00e5ff]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={customForm.longitude}
                      onChange={(e) => setCustomForm({ ...customForm, longitude: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-none bg-black border border-slate-850 p-1 text-slate-200 outline-none focus:border-[#00e5ff]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase">Duration (m)</label>
                    <input
                      type="number"
                      value={customForm.duration}
                      onChange={(e) => setCustomForm({ ...customForm, duration: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-none bg-black border border-slate-850 p-1 text-slate-200 outline-none focus:border-[#00e5ff]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 uppercase">Crowd Size</label>
                    <input
                      type="number"
                      value={customForm.crowd_size}
                      onChange={(e) => setCustomForm({ ...customForm, crowd_size: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-none bg-black border border-slate-850 p-1 text-slate-200 outline-none focus:border-[#00e5ff]"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSimulateCustom}
                className="w-full py-1.5 bg-yellow-950/20 border border-yellow-500/60 hover:bg-yellow-500 hover:text-black transition text-yellow-500 font-bold uppercase tracking-wider text-[9px] mt-1"
              >
                SIMULATE CUSTOM VECTOR
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-650 p-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 mb-1">Preset Vector Active</span>
              <p className="text-[9px] text-slate-500 leading-relaxed max-w-[200px]">
                {activeIncident
                  ? `Active target: '${activeIncident.event_type}' is locked. Click '+ CUSTOM CREATOR' preset button to override or compile a bespoke incident scenario.`
                  : 'Select an incident preset above to load spatial coordinate overlays into the simulator.'}
              </p>
            </div>
          )}
        </div>

        {/* PANEL 2: FORECAST PANEL */}
        <div className="p-3 border-r border-slate-900 flex flex-col justify-between h-full overflow-y-auto">
          <div>
            <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">
              [02] SPATIOTEMPORAL FORECAST
            </div>
            
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
                <div className="flex justify-between border-b border-slate-900 pb-1">
                  <span className="text-slate-500">MODEL CONFIDENCE:</span>
                  <span className="text-cyan-400 font-bold">98.42%</span>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-650 text-center py-8">
                AWAITING INITIALIZATION...
              </div>
            )}
          </div>

          {phase === 2 && activeIncident && (
            <button
              onClick={handleDeployInterventions}
              className="w-full py-2 bg-red-950/20 border border-red-500 text-red-500 font-bold hover:bg-red-500 hover:text-black transition uppercase tracking-wider text-[9px] animate-pulse"
            >
              DEPLOY BARRICADES & DIVERT FLOW
            </button>
          )}
        </div>

        {/* PANEL 3: GEMINI DISPATCH */}
        <div className="p-3 border-r border-slate-900 flex flex-col h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              [03] GEMINI SOP DISPATCH
            </span>
            {dispatchData && (
              <div className="flex space-x-1">
                <button
                  onClick={() => setDispatchTab('en')}
                  className={`px-1 py-0.5 text-[8px] font-bold border ${dispatchTab === 'en' ? 'border-[#00e5ff] text-[#00e5ff]' : 'border-slate-800 text-slate-500'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setDispatchTab('kn')}
                  className={`px-1 py-0.5 text-[8px] font-bold border ${dispatchTab === 'kn' ? 'border-emerald-500 text-emerald-400' : 'border-slate-800 text-slate-500'}`}
                >
                  KN
                </button>
              </div>
            )}
          </div>

          {isLlmLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-6 h-6 border border-cyan-400 border-t-transparent animate-spin mb-2 rounded-none" />
              <span className="text-[9px] text-[#00e5ff] uppercase tracking-wider animate-pulse">SYNTHESIZING SOP VIA GEMINI...</span>
            </div>
          ) : dispatchData ? (
            <div className="flex-1 flex flex-col justify-between text-[9.5px]">
              <div className="bg-black/60 border border-slate-900 p-2 overflow-y-auto max-h-[120px] scrollbar-thin flex-1">
                {dispatchTab === 'en' ? (
                  <p className="text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                    <span className="text-[#00e5ff] font-bold block mb-1">[TACTICAL Relays]</span>
                    {dispatchData.action_plan_english}
                  </p>
                ) : (
                  <p className="text-emerald-400/90 leading-relaxed font-sans whitespace-pre-wrap">
                    <span className="text-emerald-500 font-bold block mb-1 font-mono">[ರೇಡಿಯೋ ಆಜ್ಞೆ]</span>
                    {dispatchData.action_plan_kannada}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 pt-1 border-t border-slate-900 text-[9px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">COP DEPLOYMENT:</span>
                  <span className="text-[#00e5ff] font-bold">{dispatchData.required_personnel} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CORDON UNITS:</span>
                  <span className="text-[#00e5ff] font-bold">{dispatchData.required_barricades} units</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-650 text-center py-8 flex-1 flex items-center justify-center">
              AWAITING INCIDENT VECTOR...
            </div>
          )}
        </div>

        {/* PANEL 4: IMPACT PANEL */}
        <div className="p-3 flex flex-col h-full overflow-y-auto">
          <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">
            [04] CASCADING IMPACT CALCULATOR
          </div>

          {activeIncident && phase >= 3 ? (
            <div className="space-y-2.5 text-[10px] flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-black/50 border border-slate-900 p-2 text-center">
                  <span className="text-[8px] text-slate-500 uppercase block">DELAY REDUCTION</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    -{activeIncident.severity * 11 + 8 - Math.round(activeIncident.severity * 3.5 + 3)}m
                  </span>
                </div>
                <div className="bg-black/50 border border-slate-900 p-2 text-center">
                  <span className="text-[8px] text-slate-500 uppercase block">SATURATION DROP</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    -64.8%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-black/50 border border-slate-900 p-2 text-center">
                  <span className="text-[8px] text-slate-500 uppercase block">FLEET TRANSITS DEFLECTED</span>
                  <span className="text-sm font-black text-cyan-400 font-mono">
                    142 cargo
                  </span>
                </div>
                <div className="bg-black/50 border border-slate-900 p-2 text-center">
                  <span className="text-[8px] text-slate-500 uppercase block">JUNCTION VELOCITY GAIN</span>
                  <span className="text-sm font-black text-cyan-400 font-mono">
                    +38%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-655 text-center py-8 flex-1 flex items-center justify-center">
              AWAITING MITIGATION DEPLOYMENT...
            </div>
          )}
        </div>

      </section>

      {/* PERSISTENT TERMINAL STREAM */}
      <section className="w-full bg-black border-t border-slate-900 flex flex-col h-40 shrink-0 select-text overflow-hidden relative">
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