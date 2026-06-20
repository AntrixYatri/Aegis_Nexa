import { useState, useCallback } from "react";

export interface Incident {
  event_type: string;
  latitude: number;
  longitude: number;
  severity: number;
}

export interface CongestedCorridor {
  coordinates: [number, number][];
  risk_score: number;
}

export interface MitigationCorridor {
  coordinates: [number, number][];
  flow_allocation_percentage: number;
  flow_delta: number;
}

export interface RecoveryCorridor {
  coordinates: [number, number][];
  risk_score: number;
  flow_delta: number;
}

export interface SimulationResult {
  status: string;
  blast_radius_meters: number;
  impacted_nodes: any[];
  detour_geometry: any[];
  congested_corridors?: CongestedCorridor[];
  mitigation_corridors?: MitigationCorridor[];
  recovery_corridors?: RecoveryCorridor[];
}

export interface QuarantineZone {
  type: string;
  features: Array<{
    type: string;
    properties: {
      zone_status: string;
      reason: string;
      timestamp: string;
    };
    geometry: {
      type: string;
      coordinates: number[][][]; // Array of rings of [lng, lat]
    };
  }>;
}

export const useSimulation = (logMessage?: (msg: string, type: "info" | "warn" | "critical" | "success") => void) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [quarantineZone, setQuarantineZone] = useState<QuarantineZone | null>(null);

  const triggerSimulation = useCallback(async (type: string, latitude: number, longitude: number, severity: number) => {
    setLoading(true);
    setError(null);
    if (logMessage) {
      logMessage(`[COMMAND] INITIALIZING SPATIOTEMPORAL FORECAST ENGINE FOR '${type.toUpperCase()}'`, "info");
    }

    try {
      // 1. Trigger main event simulation
      const simResponse = await fetch("http://localhost:8000/api/v1/simulate-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: type,
          latitude,
          longitude,
          severity,
        }),
      });

      if (!simResponse.ok) {
        const errData = await simResponse.json().catch(() => ({}));
        throw new Error(errData.detail || `Simulation failed with code: ${simResponse.status}`);
      }

      const simData: SimulationResult = await simResponse.json();
      
      if (logMessage) {
        logMessage(`[SUCCESS] ST-GNN PROJECTION CALCULATED. IMPACTED NODES: ${simData.impacted_nodes.length}, BLAST RADIUS: ${simData.blast_radius_meters}M`, "success");
      }

      setActiveIncident({ event_type: type, latitude, longitude, severity });
      setSimulationResult(simData);

      // 2. Trigger containment zone fetch (with error containment in case backend datetime has import bugs)
      try {
        const qResponse = await fetch(`http://localhost:8000/api/v1/event-quarantine-zones?lat=${latitude}&lng=${longitude}&radius_offset=0.006`);
        if (!qResponse.ok) {
          throw new Error("Quarantine service returned non-200");
        }
        const qData: QuarantineZone = await qResponse.json();
        setQuarantineZone(qData);
        if (logMessage) {
          logMessage(`[SUCCESS] LOGISTICS CONTAINMENT CORDON GENERATED FOR FLIPKART FLEET`, "success");
        }
      } catch (qErr) {
        console.warn("Could not retrieve quarantine zone from server, using local geometry fallback.", qErr);
        // Local geometry fallback to keep user visual interface functional
        const min_lat = latitude - 0.005;
        const max_lat = latitude + 0.005;
        const min_lng = longitude - 0.005;
        const max_lng = longitude + 0.005;
        const fallbackQuarantine: QuarantineZone = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                zone_status: "LOCKED",
                reason: "Local Tactical Cordon (System Fallback)",
                timestamp: new Date().toISOString()
              },
              geometry: {
                type: "Polygon",
                coordinates: [[
                  [min_lng, min_lat],
                  [max_lng, min_lat],
                  [max_lng, max_lat],
                  [min_lng, max_lat],
                  [min_lng, min_lat]
                ]]
              }
            }
          ]
        };
        setQuarantineZone(fallbackQuarantine);
        if (logMessage) {
          logMessage(`[WARN] LOGISTICS CONTAINER FALLBACK ACTIVATED: LOCAL BOUNDS COMPUTED`, "warn");
        }
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected simulation error occurred.");
      if (logMessage) {
        logMessage(`[CRITICAL] SIMULATION ERROR: ${err.message || "UNRESOLVED ROUTING CONFLICT"}`, "critical");
      }
    } finally {
      setLoading(false);
    }
  }, [logMessage]);

  const clearSimulation = useCallback(() => {
    setActiveIncident(null);
    setSimulationResult(null);
    setQuarantineZone(null);
    if (logMessage) {
      logMessage("[INFO] SIMULATION CANVAS FLUSHED. SYSTEM IN STANDBY MODE.", "info");
    }
  }, [logMessage]);

  return {
    loading,
    error,
    activeIncident,
    simulationResult,
    quarantineZone,
    triggerSimulation,
    clearSimulation,
  };
};
