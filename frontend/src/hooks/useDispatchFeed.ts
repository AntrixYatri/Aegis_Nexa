import { useState, useCallback } from "react";

export interface DispatchResponse {
  event_metadata: {
    type: string;
    severity_level: number;
    incident_location: [number, number];
  };
  intelligence_output: {
    action_plan_english: string;
    action_plan_kannada: string;
    required_personnel: number;
    required_barricades: number;
  };
}

export const useDispatchFeed = (logMessage?: (msg: string, type: "info" | "warn" | "critical" | "success") => void) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dispatchData, setDispatchData] = useState<DispatchResponse | null>(null);
  const [deploymentState, setDeploymentState] = useState<"IDLE" | "PENDING" | "DISPATCHED" | "ACTIVE">("IDLE");

  const fetchDispatchOrders = useCallback(async (type: string, severity: number, lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    setDeploymentState("PENDING");
    if (logMessage) {
      logMessage(`[COMMAND] ROUTING SOP SYNTHESIS THROUGH GEMINI INTELLIGENCE SYSTEM...`, "info");
    }

    try {
      const response = await fetch("http://localhost:8000/api/v1/dispatch-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: type,
          severity,
          latitude: lat,
          longitude: lng,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate dispatch. Server status: ${response.status}`);
      }

      const data: DispatchResponse = await response.json();
      setDispatchData(data);

      if (logMessage) {
        logMessage(`[SUCCESS] DUAL-LANGUAGE SOP RECEIVED. [EN]: "${data.intelligence_output.action_plan_english.substring(0, 45)}..."`, "success");
        logMessage(`[SUCCESS] BTP PERSONNEL COUNTED: ${data.intelligence_output.required_personnel} UNITS, BARRICADES: ${data.intelligence_output.required_barricades} UNITS`, "success");
      }

      // Simulate deployment sequence states
      setTimeout(() => {
        setDeploymentState("DISPATCHED");
        if (logMessage) {
          logMessage("[INFO] FLEET CORRIDOR CLEARANCE: DISPATCH ORDER DEPLOYED TO PRECINCT RADIO SYSTEM", "info");
        }
      }, 1500);

      setTimeout(() => {
        setDeploymentState("ACTIVE");
        if (logMessage) {
          logMessage("[SUCCESS] BENGALURU TRAFFIC POLICE ACTIVE ON-SITE AT SPECIFIED JUNCTION", "success");
        }
      }, 3500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch dispatch SOP.");
      setDeploymentState("IDLE");
      if (logMessage) {
        logMessage(`[CRITICAL] INTELLIGENCE FAILURE: ${err.message || "API TIMEOUT"}`, "critical");
      }
    } finally {
      setLoading(false);
    }
  }, [logMessage]);

  const clearDispatch = useCallback(() => {
    setDispatchData(null);
    setDeploymentState("IDLE");
    if (logMessage) {
      logMessage("[INFO] DISPATCH PANEL CLEAR. DEPLOYMENT DISCHARGED.", "info");
    }
  }, [logMessage]);

  return {
    loading,
    error,
    dispatchData,
    deploymentState,
    fetchDispatchOrders,
    clearDispatch,
    setDeploymentState
  };
};
