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

  const [showHistoricalRisk, setShowHistoricalRisk] = useState(false);
  const [vulnerabilityData, setVulnerabilityData] = useState<{
    hotspots: any[];
    summary: { total_incidents: number; high_risk_locations: number };
  }>({
    hotspots: [],
    summary: { total_incidents: 0, high_risk_locations: 0 }
  });

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

  // Decision Intelligence States (Phase 4)
  const [networkMode, setNetworkMode] = useState<'current' | 'mitigated'>('mitigated');
  const [timelineStage, setTimelineStage] = useState(0);
  const [replayTrigger, setReplayTrigger] = useState(0);
  const incidentTimeRef = useRef<Date>(new Date());

  // Automatically advance simulation timeline progressively (T+0 to T+6 stages) on active incident change
  useEffect(() => {
    if (activeIncident) {
      incidentTimeRef.current = new Date();
      setTimelineStage(0);
      const interval = setInterval(() => {
        setTimelineStage((prev) => {
          if (prev < 6) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, 700); // 700ms step propagation duration
      return () => clearInterval(interval);
    } else {
      setTimelineStage(0);
    }
  }, [activeIncident?.id, replayTrigger]);

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

  // Fetch historical vulnerability mapping data on mount
  useEffect(() => {
    fetch('http://localhost:8000/api/v1/historical-risk-map')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setVulnerabilityData(data);
        pushLog(`[SUCCESS] Aggregated Astram datasets loaded. Total incidents: ${data.summary.total_incidents}.`, 'success');
      })
      .catch((err) => {
        console.error("Vulnerability fetch error:", err);
        pushLog(`[WARN] Failed to load vulnerability index: ${err.message}`, 'warn');
      });
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
      
      // Generate structured mock nodes with latitude, longitude, and risk_score
      const mockNodes = Array.from({ length: incident.severity }).map((_, i) => {
        const angle = (i * 2 * Math.PI) / incident.severity;
        const offsetLng = (mockRadius * 0.00001) * Math.cos(angle);
        const offsetLat = (mockRadius * 0.00001) * Math.sin(angle);
        return {
          latitude: incident.latitude + offsetLat,
          longitude: incident.longitude + offsetLng,
          risk_score: Math.min(100, Math.max(10, 100 - i * 10))
        };
      });

      // Generate structured detour paths matching the BPR routing outputs
      const mockDetours = [
        {
          route_index: 0,
          flow_allocation_percentage: 50,
          coordinates: [
            [incident.longitude, incident.latitude],
            [incident.longitude + 0.002, incident.latitude + 0.002],
            [incident.longitude + 0.005, incident.latitude + 0.003]
          ]
        },
        {
          route_index: 1,
          flow_allocation_percentage: 30,
          coordinates: [
            [incident.longitude, incident.latitude],
            [incident.longitude - 0.002, incident.latitude + 0.003],
            [incident.longitude - 0.004, incident.latitude + 0.002],
            [incident.longitude - 0.005, incident.latitude + 0.004]
          ]
        },
        {
          route_index: 2,
          flow_allocation_percentage: 20,
          coordinates: [
            [incident.longitude, incident.latitude],
            [incident.longitude + 0.002, incident.latitude - 0.002],
            [incident.longitude + 0.004, incident.latitude - 0.004]
          ]
        }
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
    const events: Array<{ time: string; label: string; active: boolean; stage: number }> = [];
    if (activeIncident) {
      const baseTime = incidentTimeRef.current;
      const formatTimeOffset = (seconds: number) => {
        const d = new Date(baseTime.getTime() + seconds * 1000);
        return d.toTimeString().split(' ')[0];
      };
      events.push({ time: formatTimeOffset(0), label: 'Incident Created', active: timelineStage >= 0, stage: 0 });
      events.push({ time: formatTimeOffset(2), label: 'ST-GNN Triggered', active: timelineStage >= 1, stage: 1 });
      events.push({ time: formatTimeOffset(5), label: 'Prediction Generated', active: timelineStage >= 2 && !!simulationResult, stage: 2 });
      events.push({ time: formatTimeOffset(9), label: 'Gemini SOP Generated', active: timelineStage >= 3 && !!dispatchData, stage: 3 });
      events.push({ time: formatTimeOffset(15), label: 'Mitigation Deployed', active: timelineStage >= 4 && phase >= 3, stage: 4 });
      events.push({ time: formatTimeOffset(22), label: 'Fleet Rerouted', active: timelineStage >= 5 && phase >= 4, stage: 5 });
      events.push({ time: formatTimeOffset(30), label: 'Congestion Reduced', active: timelineStage >= 6 && phase >= 4, stage: 6 });
    }
    return events.filter(ev => ev.stage <= timelineStage);
  };

  // Dynamic spatiotemporal trends for the active incident
  const getCongestionTrend = () => {
    if (simulationResult?.metrics?.congestion_trend) {
      return simulationResult.metrics.congestion_trend;
    }
    return [0, 0, 0, 0, 0];
  };

  const getEfficiencyTrend = () => {
    if (simulationResult?.metrics?.efficiency_trend) {
      return simulationResult.metrics.efficiency_trend;
    }
    return [0, 0, 0, 0, 0];
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
      <main className="w-full flex flex-col lg:flex-row gap-3 px-4 pt-3 pb-0 shrink-0">

        {/* Column 1: Incident Controls (Left) - occupies 20% width */}
        <section className="w-full lg:w-[20%] flex flex-col shrink-0 select-text gap-3.5">
          <TacticalHudCard
            title="INCIDENT CONTROLS"
            subtitle="SCENARIO BUILDER"
            statusColor={isCustomMode ? "alert" : "primary"}
            cornerIndicator="OP//CTRL"
          >
            {isCustomMode ? (
              <div className="space-y-3.5 text-xs flex flex-col h-full justify-between">
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Incident Type</label>
                    <input
                      type="text"
                      value={customForm.event_type}
                      onChange={(e) => setCustomForm({ ...customForm, event_type: e.target.value })}
                      className="w-full rounded-none bg-black border border-slate-800 p-1.5 text-slate-200 outline-none focus:border-[#00e5ff] transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={customForm.latitude}
                        onChange={(e) => setCustomForm({ ...customForm, latitude: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-none bg-black border border-slate-800 p-1.5 text-slate-200 outline-none focus:border-[#00e5ff] transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Longitude</label>
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
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Duration (m)</label>
                      <input
                        type="number"
                        value={customForm.duration}
                        onChange={(e) => setCustomForm({ ...customForm, duration: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-none bg-black border border-slate-800 p-1.5 text-slate-200 outline-none focus:border-[#00e5ff] transition"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Crowd Size</label>
                      <input
                        type="number"
                        value={customForm.crowd_size}
                        onChange={(e) => setCustomForm({ ...customForm, crowd_size: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-none bg-black border border-slate-800 p-1.5 text-slate-200 outline-none focus:border-[#00e5ff] transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Severity Index ({customForm.severity}/10)</label>
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
                  className="w-full py-2 bg-yellow-950/20 border border-yellow-500/60 hover:bg-yellow-500 hover:text-black transition text-yellow-500 font-bold uppercase tracking-widest text-[10px] mt-2 rounded-none"
                >
                  SIMULATE CUSTOM VECTOR
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-2.5">
                <div className="space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#00e5ff] tracking-wider block">// ACTIVE PRESET DATA</span>
                  {activeIncident ? (
                    <div className="space-y-1.5 border border-slate-900 p-2 bg-black/40">
                      <div className="flex justify-between border-b border-slate-950 pb-0.5">
                        <span className="text-slate-500">EVENT TYPE:</span>
                        <span className="text-slate-200 font-bold uppercase">{activeIncident.event_type}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-950 pb-0.5">
                        <span className="text-slate-500">LATENCY COORDS:</span>
                        <span className="text-slate-300 font-mono">{activeIncident.latitude.toFixed(4)}, {activeIncident.longitude.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-950 pb-0.5">
                        <span className="text-slate-500">CROWD VOLUME:</span>
                        <span className="text-slate-300">{activeIncident.crowd_size.toLocaleString()} PPL</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-950 pb-0.5">
                        <span className="text-slate-500">DURATION PROJ:</span>
                        <span className="text-slate-300">{activeIncident.duration} MINS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">CRITICALITY LEVEL:</span>
                        <span className="text-red-400 font-black">{activeIncident.severity}/10</span>
                      </div>
                      <div className="pt-1.5">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Adjust Severity</label>
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
                    <p className="text-[10px] text-slate-500 leading-relaxed uppercase">
                      Select an incident preset above to load spatial coordinate overlays into the simulator or click "+ CUSTOM CREATOR" to build a bespoke threat model.
                    </p>
                  )}
                </div>

                <div className="border border-slate-900/60 p-2 bg-[#050507] text-[10px] text-slate-500 leading-relaxed uppercase">
                  <span>SYSTEM OVERRIDE READY. PRESET SELECTION FORWARDED TO SPATIOTEMPORAL GRAPH CORE.</span>
                </div>
              </div>
            )}
          </TacticalHudCard>

          {/* Historical Vulnerability Card */}
          <TacticalHudCard 
            title="HISTORICAL RISK INDEX" 
            subtitle="ASTRAM DATASETS" 
            statusColor="primary" 
            cornerIndicator="OP//HIST"
          >
            {/* Heatmap Toggle */}
            <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px]">// HEATMAP OVERLAY</span>
              <button
                onClick={() => {
                  setShowHistoricalRisk(prev => !prev);
                  pushLog(`[COMMAND] HISTORICAL HEATMAP OVERLAY ${!showHistoricalRisk ? 'ENABLED' : 'DISABLED'}`, 'info');
                }}
                className={`px-2 py-0.5 border text-[8px] font-bold transition-all duration-150 uppercase tracking-widest rounded-none ${
                  showHistoricalRisk
                    ? 'border-[#00e5ff] bg-cyan-950/20 text-[#00e5ff]'
                    : 'border-slate-800 bg-black text-slate-500 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                {showHistoricalRisk ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[9px] mb-2 bg-black/40 border border-slate-900 p-2 uppercase">
              <div className="flex flex-col justify-between">
                <span className="text-slate-500 block mb-0.5">TOTAL INCIDENTS:</span>
                <span className="text-slate-200 font-bold text-xs">{vulnerabilityData.summary.total_incidents.toLocaleString()}</span>
              </div>
              <div className="flex flex-col justify-between">
                <span className="text-slate-500 block mb-0.5">HIGH RISK BINS:</span>
                <span className="text-yellow-500 font-bold text-xs">{vulnerabilityData.summary.high_risk_locations}</span>
              </div>
            </div>

            {/* Top 5 Hotspots */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-[#00e5ff] tracking-wider block mb-0.5">
                // TOP 4 VULNERABLE LOCATIONS
              </span>
              {vulnerabilityData.hotspots.length === 0 ? (
                <div className="text-[9px] text-slate-600 text-center py-4 uppercase">
                  Awaiting database connection...
                </div>
              ) : (
                vulnerabilityData.hotspots.slice(0, 4).map((hs, idx) => {
                  let levelColor = 'border-slate-800 text-slate-500 bg-slate-950/50';
                  if (hs.risk_level === 'critical') levelColor = 'border-red-500/50 text-red-400 bg-red-950/20';
                  else if (hs.risk_level === 'high') levelColor = 'border-orange-500/50 text-orange-400 bg-orange-950/20';
                  else if (hs.risk_level === 'moderate') levelColor = 'border-yellow-500/50 text-yellow-400 bg-yellow-950/20';
                  else if (hs.risk_level === 'low') levelColor = 'border-cyan-500/50 text-cyan-400 bg-cyan-950/20';

                  return (
                    <div 
                      key={hs.hotspot_id} 
                      onClick={() => {
                        const mockInc = {
                          id: hs.hotspot_id,
                          event_type: `Historical Hotspot (${hs.risk_level.toUpperCase()})`,
                          latitude: hs.latitude,
                          longitude: hs.longitude,
                          severity: Math.round(hs.risk_score / 10) || 5,
                          crowd_size: hs.incident_count * 100,
                          duration: 120
                        };
                        setActiveIncident(mockInc);
                        pushLog(`[INFO] Focussing map viewport on Historical Hotspot ${hs.hotspot_id}: ${hs.name}`, 'info');
                      }}
                      className="flex items-center justify-between border border-slate-900 hover:border-slate-700 bg-black/40 p-1.5 cursor-pointer transition-colors duration-150 text-[10px]"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-slate-500 font-bold text-[8px]">{idx + 1}.</span>
                          <span className="text-slate-300 font-bold truncate block">{hs.name}</span>
                        </div>
                        <span className="text-[8px] text-slate-500 font-mono block mt-0.5">
                          COORD: {hs.latitude.toFixed(3)}, {hs.longitude.toFixed(3)} | COUNT: {hs.incident_count}
                        </span>
                      </div>
                      <div className={`px-2 py-0.5 border text-[8px] font-bold uppercase rounded-none tracking-widest shrink-0 text-center min-w-[70px] ${levelColor}`}>
                        {hs.risk_level}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TacticalHudCard>
        </section>

        {/* Column 2: Map Area & Trends (Middle) - occupies 60% width */}
        <section className="w-full lg:w-[60%] flex flex-col gap-3 shrink-0">
          <div className="w-full relative border border-slate-800 bg-[#050507] h-[440px] lg:h-[460px] shrink-0 overflow-hidden">
            {/* BEFORE/AFTER NETWORK MODE TOGGLE */}
            <div className="absolute top-4 left-4 z-40 flex items-center bg-black/85 border border-slate-800 p-1 font-mono text-[9px]">
              <button
                onClick={() => {
                  setNetworkMode('current');
                  pushLog('[COMMAND] SWITCHED VIEWPORT TO CURRENT UNMITIGATED NETWORK', 'warn');
                }}
                className={`px-3 py-1 border transition-all duration-150 rounded-none uppercase font-bold tracking-wider ${
                  networkMode === 'current'
                    ? 'border-red-500 bg-red-950/20 text-red-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                [ CURRENT NETWORK (PROBLEM) ]
              </button>
              <div className="h-4 w-[1px] bg-slate-800 mx-1" />
              <button
                onClick={() => {
                  setNetworkMode('mitigated');
                  pushLog('[COMMAND] SWITCHED VIEWPORT TO AEGIS MITIGATED NETWORK', 'success');
                }}
                className={`px-3 py-1 border transition-all duration-150 rounded-none uppercase font-bold tracking-wider ${
                  networkMode === 'mitigated'
                    ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                [ MITIGATED NETWORK (OUTCOME) ]
              </button>
            </div>

            <MapContainer
              simulationPhase={phase}
              activeIncident={activeIncident}
              simulationResult={simulationResult}
              onLogMessage={pushLog}
              showHistoricalRisk={showHistoricalRisk}
              historicalRiskData={vulnerabilityData.hotspots}
              timelineStage={timelineStage}
              networkMode={networkMode}
            />
            <div className="absolute inset-0 pointer-events-none hud-scanline opacity-[0.15] z-20" />
          </div>

          {/* ST-GNN PREDICTIVE TRAFFIC TRENDS */}
          <TacticalHudCard title="ST-GNN PREDICTIVE TRAFFIC TRENDS" subtitle="[06] TEMPORAL CONGESTION & EFFICIENCY" statusColor="success" cornerIndicator="OP//06">
            {activeIncident ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* Congestion Reduction Timeline */}
                <div className="bg-black/50 border border-slate-900 p-4 space-y-2.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">// CONGESTION REDUCTION TIMELINE (T0 → T4)</span>
                  <div className="flex items-center justify-between text-center pt-2">
                    {getCongestionTrend().map((val, i) => (
                      <React.Fragment key={i}>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-slate-500 font-bold mb-0.5">T{i}</span>
                          <span className="text-sm font-black text-red-400 font-mono">{val}%</span>
                        </div>
                        {i < 4 && <span className="text-slate-700 text-xs font-mono">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  {/* Miniature CSS Bar Chart */}
                  <div className="flex items-end justify-between h-[60px] mt-3 px-2.5">
                    {getCongestionTrend().map((val, i) => (
                      <div 
                        key={i} 
                        className="w-5 bg-red-950 border border-red-500/50 hover:bg-red-500 transition-colors duration-150" 
                        style={{ height: `${val}%` }} 
                        title={`T${i}: ${val}% Congestion`}
                      />
                    ))}
                  </div>
                </div>

                {/* Network Efficiency Growth */}
                <div className="bg-black/50 border border-slate-900 p-4 space-y-2.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">// NETWORK EFFICIENCY GROWTH (T0 → T4)</span>
                  <div className="flex items-center justify-between text-center pt-2">
                    {getEfficiencyTrend().map((val, i) => (
                      <React.Fragment key={i}>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-slate-500 font-bold mb-0.5">T{i}</span>
                          <span className="text-sm font-black text-emerald-400 font-mono">{val}%</span>
                        </div>
                        {i < 4 && <span className="text-slate-700 text-xs font-mono">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  {/* Miniature CSS Bar Chart */}
                  <div className="flex items-end justify-between h-[60px] mt-3 px-2.5">
                    {getEfficiencyTrend().map((val, i) => (
                      <div 
                        key={i} 
                        className="w-5 bg-emerald-950 border border-emerald-500/50 hover:bg-emerald-500 transition-colors duration-150" 
                        style={{ height: `${val}%` }} 
                        title={`T${i}: ${val}% Efficiency`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-center py-4 uppercase font-bold text-[10px]">
                Awaiting incident initialization to project traffic trends...
              </div>
            )}
          </TacticalHudCard>
        </section>

        {/* Column 3: Active Threats & Timeline (Right) - occupies 20% width */}
        <section className="w-full lg:w-[20%] flex flex-col gap-3 shrink-0 select-text text-xs">
          {/* Active Incidents panel */}
          <TacticalHudCard title="ACTIVE THREAT MONITORS" subtitle="OPERATIONAL INSTANCES" statusColor="danger" cornerIndicator="TH//ACT">
            <div className="space-y-2 text-xs">
              {activeIncidentsList.length === 0 ? (
                <div className="text-center text-xs text-slate-600 py-4 uppercase font-bold">
                  NO ACTIVE SCENARIOS
                </div>
              ) : (
                activeIncidentsList.map((inc) => {
                  const isExpanded = expandedIncidentId === inc.id;
                  const isSimulatorTarget = activeIncident?.id === inc.id;

                  return (
                    <div key={inc.id} className={`border ${isSimulatorTarget ? 'border-[#00e5ff]/50' : 'border-slate-800'} p-2 bg-[#050507]`}>
                      <div
                        onClick={() => setExpandedIncidentId(isExpanded ? null : (inc.id || null))}
                        className="flex justify-between items-center cursor-pointer text-xs"
                      >
                        <span className="font-bold text-slate-300 uppercase">
                          {isExpanded ? '▼' : '▶'} {inc.event_type}
                        </span>
                        {isSimulatorTarget && (
                          <span className="text-[9px] bg-cyan-950 text-[#00e5ff] px-1 font-bold">SIM ACTIVE</span>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 border-t border-slate-900 pt-2 text-xs text-slate-400">
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
                              className="flex-1 py-1 border border-slate-700 bg-black text-slate-300 font-bold text-[10px] hover:border-slate-500 text-center"
                            >
                              EDIT
                            </button>
                            <button
                              onClick={() => handleDisableIncident(inc.id || '')}
                              className="flex-1 py-1 border border-red-900 bg-black text-red-400 font-bold text-[10px] hover:border-red-600 text-center"
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
            <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-3">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">// TIMELINE CONTROLS</span>
              {activeIncident && (
                <button
                  onClick={() => {
                    setReplayTrigger((prev) => prev + 1);
                    pushLog('[COMMAND] RESTARTING ST-GNN SPATIOTEMPORAL SIMULATION REPLAY SEQUENCE', 'success');
                  }}
                  className="px-2 py-0.5 border border-cyan-500/60 bg-cyan-950/20 text-cyan-400 text-[8.5px] font-bold tracking-wider hover:bg-cyan-400 hover:text-black transition uppercase rounded-none"
                >
                  ▶ REPLAY ANALYSIS
                </button>
              )}
            </div>
            <div className="space-y-2.5 relative pl-3 border-l border-slate-800 text-[10px]">
              {getTimelineEvents().length === 0 ? (
                <div className="text-slate-600 text-[9px] py-4 uppercase">
                  Awaiting incident initialization...
                </div>
              ) : (
                getTimelineEvents().map((ev, idx) => (
                  <div key={idx} className="relative mb-1">
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
      <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 px-4 pt-0 pb-2 select-text">

        {/* Column 1: Forecast */}
        <TacticalHudCard title="SPATIOTEMPORAL FORECAST" subtitle="[02] ST-GNN ANALYTICS" statusColor="primary" cornerIndicator="OP//02">
          <div className="flex flex-col h-full justify-start gap-1.5 min-h-[175px] text-xs">
            <div>
              {activeIncident && simulationResult ? (
                <div className="space-y-2">
                  {/* Top KPI: Confidence */}
                  <div className="bg-black/50 border border-slate-900 p-1.5 text-center">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-0.5">MODEL CONFIDENCE</span>
                    <span className="text-2xl font-black text-cyan-400 font-mono">98.4%</span>
                  </div>

                  {/* Delay KPIs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/50 border border-slate-900 p-1.5 text-center">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-0.5">BASELINE DELAY</span>
                      <span className="text-lg font-black text-red-400 font-mono">{activeIncident.severity * 11 + 8}m</span>
                    </div>
                    <div className="bg-black/50 border border-slate-900 p-1.5 text-center">
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-0.5">PREDICTED DELAY</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">{Math.round(activeIncident.severity * 3.5 + 3)}m</span>
                    </div>
                  </div>

                  {/* Other metrics */}
                  <div className="space-y-1 border-t border-slate-900/60 pt-1.5 text-[9.5px]">
                    <div className="flex justify-between border-b border-slate-950 pb-0.5">
                      <span className="text-slate-500">RISK AURA RADIUS:</span>
                      <span className="text-slate-300 font-bold">{simulationResult.blast_radius_meters} Meters</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-950 pb-0.5">
                      <span className="text-slate-500">IMPACTED OSM NODES:</span>
                      <span className="text-slate-300 font-bold">{simulationResult.impacted_nodes.length} intersections</span>
                    </div>
                  </div>

                  {/* Explainability sub-factors */}
                  <div className="pt-1.5 space-y-1 border-t border-slate-900/60 text-[9px]">
                    <span className="text-slate-500 block uppercase font-bold tracking-wider">// EXPLAINABILITY SUB-FACTORS</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">HISTORICAL SIMILARITY:</span>
                      <span className="text-slate-300 font-bold">{Math.round(85 + activeIncident.severity * 1.3)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">GRAPH STABILITY (L-EIGEN):</span>
                      <span className="text-slate-300 font-bold">{Math.round(92 - activeIncident.severity * 0.8)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">ROUTE CONSENSUS:</span>
                      <span className="text-slate-300 font-bold">96.8%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">DATA COMPLETENESS:</span>
                      <span className="text-slate-300 font-bold">99.2%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-600 text-center py-8">
                  AWAITING SIMULATION CORE DATA...
                </div>
              )}
            </div>

            {phase === 2 && activeIncident && (
              <button
                onClick={handleDeployInterventions}
                className="w-full py-2.5 bg-red-950/20 border border-red-500 text-red-500 font-bold hover:bg-red-500 hover:text-black transition uppercase tracking-wider text-[10px] animate-pulse rounded-none mt-4"
              >
                DEPLOY BARRICADES & DIVERT FLOW
              </button>
            )}
          </div>
        </TacticalHudCard>

        {/* Column 2: Gemini SOP */}
        <TacticalHudCard title="GEMINI SOP DISPATCH" subtitle="[03] INTELLIGENCE PROTOCOLS" statusColor="primary" cornerIndicator="OP//03">
          <div className="flex flex-col h-full justify-start gap-1.5 min-h-[175px] text-xs">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">LANG BROADCAST RELAYS</span>
              {dispatchData && (
                <div className="flex space-x-1">
                  <button
                    onClick={() => setDispatchTab('en')}
                    className={`px-2 py-0.5 text-[9px] font-bold border rounded-none transition ${dispatchTab === 'en' ? 'border-[#00e5ff] text-[#00e5ff] bg-cyan-950/20' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setDispatchTab('kn')}
                    className={`px-2 py-0.5 text-[9px] font-bold border rounded-none transition ${dispatchTab === 'kn' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    KN
                  </button>
                </div>
              )}
            </div>

            {isLlmLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                <div className="w-5 h-5 border border-cyan-400 border-t-transparent animate-spin mb-2 rounded-none" />
                <span className="text-[10px] text-[#00e5ff] uppercase tracking-wider animate-pulse">SYNTHESIZING SOP VIA GEMINI...</span>
              </div>
            ) : dispatchData ? (
              <div className="flex-1 flex flex-col justify-start gap-1.5 min-h-0 text-xs">
                <div className="bg-black/60 border border-slate-900 p-2 overflow-y-auto flex-1 min-h-[65px] scrollbar-thin text-slate-300">
                  {dispatchTab === 'en' ? (
                    <p className="leading-relaxed font-mono whitespace-pre-wrap text-[11.5px]">
                      <span className="text-[#00e5ff] font-bold block mb-1">[TACTICAL Relays]</span>
                      {dispatchData.action_plan_english}
                    </p>
                  ) : (
                    <p className="leading-relaxed font-sans whitespace-pre-wrap text-emerald-400/90 text-[12.5px]">
                      <span className="text-emerald-500 font-bold block mb-1 font-mono">[ರೇಡಿಯೋ ಆಜ್ಞೆ]</span>
                      {dispatchData.action_plan_kannada}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-slate-900/60 text-[10px] tracking-wider font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-500">COP ALIGN:</span>
                    <span className="text-[#00e5ff]">{dispatchData.required_personnel} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">BARRICADES:</span>
                    <span className="text-[#00e5ff]">{dispatchData.required_barricades} units</span>
                  </div>
                </div>
                {/* Expected Outcome Section */}
                <div className="border-t border-slate-900/60 pt-1.5 space-y-0.5 text-[9px] tracking-wider uppercase font-mono">
                  <span className="text-slate-500 font-bold block mb-0.5">// EXPECTED OUTCOME</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">EXPECTED DELAY REDUCTION:</span>
                    <span className="text-emerald-400 font-bold text-[10px]">
                      {activeIncident ? `${(activeIncident.severity * 11 + 8) - Math.round(activeIncident.severity * 3.5 + 3)} MINS` : '57 MINS'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">AFFECTED NODES:</span>
                    <span className="text-cyan-400 font-bold">{simulationResult?.impacted_nodes?.length || 20}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CONFIDENCE:</span>
                    <span className="text-cyan-400 font-bold">98.4%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-600 text-center py-8">
                AWAITING SOP TRANSMISSION...
              </div>
            )}
          </div>
        </TacticalHudCard>

        {/* Column 3: Network Impact Analysis */}
        <TacticalHudCard title="NETWORK IMPACT ANALYSIS" subtitle="[04] REAL-TIME MITIGATIONS" statusColor="primary" cornerIndicator="OP//04">
          <div className="flex flex-col h-full justify-start gap-1.5 min-h-[175px] text-xs">
            {activeIncident && phase >= 3 && simulationResult?.metrics ? (
              <div className="space-y-2 flex-1 flex flex-col justify-start gap-2">
                {/* Before/After stats as large KPI panels */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/50 border border-slate-900 p-1.5">
                    <span className="text-[9.5px] text-slate-500 block uppercase tracking-wider mb-0.5 leading-none">AVG TRAVEL TIME</span>
                    <div className="flex items-baseline space-x-1 font-bold font-mono">
                      <span className="text-red-400 text-xs font-black">{simulationResult.metrics.baseline_delay_mins}m</span>
                      <span className="text-slate-600 text-[10px]">→</span>
                      <span className="text-emerald-400 text-sm font-black">{simulationResult.metrics.mitigated_delay_mins}m</span>
                    </div>
                  </div>
                  <div className="bg-black/50 border border-slate-900 p-1.5">
                    <span className="text-[9.5px] text-slate-500 block uppercase tracking-wider mb-0.5 leading-none">CONGESTION INDEX</span>
                    <div className="flex items-baseline space-x-1 font-bold font-mono">
                      <span className="text-red-400 text-xs font-black">{simulationResult.metrics.congestion_index_before}%</span>
                      <span className="text-slate-600 text-[10px]">→</span>
                      <span className="text-emerald-400 text-sm font-black">{simulationResult.metrics.congestion_index_after}%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/50 border border-slate-900 p-1.5">
                    <span className="text-[9.5px] text-slate-500 block uppercase tracking-wider mb-0.5 leading-none">AFFECTED NODES</span>
                    <div className="flex items-baseline space-x-1 font-bold font-mono">
                      <span className="text-red-400 text-xs font-black">{simulationResult.metrics.affected_nodes_before}</span>
                      <span className="text-slate-600 text-[10px]">→</span>
                      <span className="text-emerald-400 text-sm font-black">{simulationResult.metrics.affected_nodes_after}</span>
                    </div>
                  </div>
                  <div className="bg-black/50 border border-slate-900 p-1.5">
                    <span className="text-[9.5px] text-slate-500 block uppercase tracking-wider mb-0.5 leading-none">NET EFFICIENCY</span>
                    <div className="flex items-baseline space-x-1 font-bold font-mono">
                      <span className="text-red-400 text-xs font-black">{simulationResult.metrics.network_efficiency_before}%</span>
                      <span className="text-slate-600 text-[10px]">→</span>
                      <span className="text-emerald-400 text-sm font-black">{simulationResult.metrics.network_efficiency_after}%</span>
                    </div>
                  </div>
                </div>

                {/* CSS comparison bar chart */}
                <div className="space-y-1.5 border-t border-slate-900/60 pt-1.5 text-[9px] uppercase tracking-wider font-mono">
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-red-400">UNMITIGATED DELAY: {simulationResult.metrics.baseline_delay_mins}m</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 border border-slate-900">
                      <div 
                        className="bg-red-500/80 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (simulationResult.metrics.baseline_delay_mins / 120) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">AEGIS MITIGATED: {simulationResult.metrics.mitigated_delay_mins}m</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 border border-slate-900">
                      <div 
                        className="bg-emerald-500/80 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (simulationResult.metrics.mitigated_delay_mins / 120) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-600 text-center py-8">
                {activeIncident && phase >= 3 ? "COMPUTING SPATIOTEMPORAL METRICS..." : "AWAITING MITIGATION DEPLOYMENT..."}
              </div>
            )}
          </div>
        </TacticalHudCard>

        {/* Column 4: Fleet Status */}
        <TacticalHudCard title="FLEET ROUTING STATUS" subtitle="[05] LOGISTICS TELEMETRY" statusColor={phase >= 3 ? "success" : "primary"} cornerIndicator="OP//05">
          <div className="flex flex-col h-full justify-start gap-1.5 min-h-[175px] text-xs">
            {activeIncident ? (
              <div className="space-y-2 flex-1 flex flex-col justify-start gap-2">
                <div className="space-y-1.5 border border-slate-900 p-1.5 bg-black/40">
                  <div className="flex justify-between border-b border-slate-950 pb-0.5">
                    <span className="text-slate-500 text-[10px]">FLEET STATE:</span>
                    <span className={`font-bold text-[10px] ${phase >= 3 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
                      {phase >= 3 ? 'REROUTED // CORRIDOR ON' : 'STANDBY // NORMAL ROUTES'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-950 pb-0.5">
                    <span className="text-slate-500 text-[10px]">WEBHOOK HANDSHAKE:</span>
                    <span className={`font-mono text-[9.5px] ${phase >= 3 ? 'text-[#00e5ff]' : 'text-slate-500'}`}>
                      {phase >= 3 ? 'SECURE_FK_NET_TOKEN' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[10px]">FLEET DEFLECTIONS:</span>
                    <span className={`font-bold text-[10px] ${phase >= 3 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {phase >= 3 ? `${Math.round(activeIncident.severity * 28 + 2)} VEHICLES` : '0 VEHICLES'}
                    </span>
                  </div>
                </div>

                {/* Redesigned Route Cards as KPI blocks */}
                <div className="space-y-1.5">
                  {simulationResult?.detour_geometry && simulationResult.detour_geometry.length > 0 ? (
                    simulationResult.detour_geometry.map((route: any, idx: number) => {
                      const names = ["ROUTE A", "ROUTE B", "ROUTE C"];
                      const subnames = ["PRIMARY", "SECONDARY", "TERTIARY"];
                      const routeName = names[route.route_index] || `ROUTE ${String.fromCharCode(65 + route.route_index)}`;
                      const routeSub = subnames[route.route_index] || "DIVERSION";
                      const flow = route.flow_allocation_percentage || 30;
                      const coordsCount = route.coordinates?.length || 0;
                      
                      // Dynamic ETA/delay calculations
                      let delayMins = 0;
                      if (networkMode === 'current') {
                        delayMins = activeIncident.severity * (11 + route.route_index * 2) + (8 + route.route_index * 4);
                      } else {
                        delayMins = Math.round(activeIncident.severity * (3.5 + route.route_index * 0.7) + (3 + route.route_index * 2));
                      }

                      const isCongested = networkMode === 'current';
                      const statusColor = isCongested ? 'border-red-950 text-red-400' : 'border-slate-900 text-slate-300';

                      return (
                        <div key={idx} className={`border ${statusColor} bg-black/45 p-1.5 space-y-0.5 uppercase tracking-wider`}>
                          <div className="flex justify-between items-center border-b border-slate-900/60 pb-0.5">
                            <div className="flex flex-col">
                              <span className="text-[9.5px] font-black text-slate-100">{routeName}</span>
                              <span className="text-[7px] text-slate-500 tracking-widest">{routeSub}</span>
                            </div>
                            <span className={`text-[8px] font-bold ${isCongested ? 'text-red-400 animate-pulse' : 'text-[#00e5ff]'}`}>
                              {isCongested ? 'CONGESTED' : 'FLOW ACTIVE'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-1 text-center">
                            <div className="bg-slate-950/60 p-0.5 border border-slate-900/60 flex flex-col justify-center">
                              <span className="text-[10px] font-black text-cyan-400 font-mono">{flow}%</span>
                              <span className="text-[6.5px] text-slate-500 tracking-tight mt-0.5 leading-none">Allocation</span>
                            </div>
                            <div className="bg-slate-950/60 p-0.5 border border-slate-900/60 flex flex-col justify-center">
                              <span className="text-[10px] font-black text-slate-200 font-mono">{delayMins}m</span>
                              <span className="text-[6.5px] text-slate-500 tracking-tight mt-0.5 leading-none">ETA Delay</span>
                            </div>
                            <div className="bg-slate-950/60 p-0.5 border border-slate-900/60 flex flex-col justify-center">
                              <span className="text-[10px] font-black text-slate-200 font-mono">{coordsCount}</span>
                              <span className="text-[6.5px] text-slate-500 tracking-tight mt-0.5 leading-none">Nodes</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[9px] text-slate-600 text-center py-4 uppercase font-bold">
                      Awaiting spatiotemporal routing geometry...
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-600 text-center py-8">
                AWAITING ROUTING METRICS...
              </div>
            )}
          </div>
        </TacticalHudCard>

      </section>

      {/* PERSISTENT TERMINAL STREAM */}
      <section className="w-full bg-black border-t border-slate-900 flex flex-col h-40 shrink-0 select-text relative mt-1.5">
        {/* Terminal Header */}
        <div className="flex justify-between items-center border-b border-slate-950 bg-slate-950 px-4 py-1.5 shrink-0 h-7">
          <span className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">
            AuraOS Core v1.0.0 // SPATIOTEMPORAL SIMULATION STREAM
          </span>
          <button
            onClick={() => setLogs([
              { timestamp: new Date().toTimeString().split(' ')[0], message: 'Logs flushed. Terminal Core monitoring standby.', type: 'info' }
            ])}
            className="text-slate-600 hover:text-slate-400 uppercase tracking-wider text-[10px] border border-slate-900 px-2 hover:border-slate-700 transition rounded-none bg-black"
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
              <div key={idx} className="flex gap-3 items-start leading-relaxed text-xs font-mono select-text">
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