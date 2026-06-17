import { useState, useEffect, useRef } from "react";

export interface FleetVehicle {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  status: "active" | "delayed" | "rerouted";
  type: "van" | "truck" | "cargo_scooter";
  speed: number; // km/h
  heading: number; // degrees
  targetJunction: string;
}

// Pre-seeded junctions in Bengaluru for fleet paths
const BENGALURU_JUNCTIONS = [
  { name: "Silk Board", coords: [77.6226, 12.9176] },
  { name: "Hebbal Flyover", coords: [77.5920, 13.0359] },
  { name: "Koramangala 80ft Rd", coords: [77.6245, 12.9348] },
  { name: "Indiranagar 100ft Rd", coords: [77.6387, 12.9719] },
  { name: "MG Road Metro", coords: [77.6066, 12.9740] },
  { name: "Town Hall", coords: [77.5855, 12.9642] },
  { name: "Yeshwanthpur", coords: [77.5501, 13.0238] },
  { name: "Whitefield ITPL", coords: [77.7346, 12.9866] },
  { name: "Electronic City Phase 1", coords: [77.6657, 12.8485] },
  { name: "Majestic Interchange", coords: [77.5714, 12.9767] },
];

export const useFleetData = (
  activeIncidentCoords: [number, number] | null,
  detourCoords: [number, number][] | null,
  logMessage?: (msg: string, type: "info" | "warn" | "critical" | "success") => void
) => {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize fleet
  useEffect(() => {
    const initialVehicles: FleetVehicle[] = Array.from({ length: 45 }).map((_, i) => {
      // Pick random junction, add noise to distribute fleet
      const baseJunction = BENGALURU_JUNCTIONS[i % BENGALURU_JUNCTIONS.length];
      const lngNoise = (Math.random() - 0.5) * 0.02;
      const latNoise = (Math.random() - 0.5) * 0.02;
      
      const vehicleTypes: Array<FleetVehicle["type"]> = ["van", "truck", "cargo_scooter"];
      const type = vehicleTypes[i % 3];
      const speed = type === "cargo_scooter" ? 42 : type === "van" ? 35 : 28;

      return {
        id: `FK-FLEET-${1000 + i}`,
        coordinates: [baseJunction.coords[0] + lngNoise, baseJunction.coords[1] + latNoise],
        status: "active",
        type,
        speed,
        heading: Math.floor(Math.random() * 360),
        targetJunction: baseJunction.name,
      };
    });

    setVehicles(initialVehicles);
  }, []);

  // Update fleet positions in real time
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setVehicles((prev) =>
        prev.map((v) => {
          let currentCoords = [...v.coordinates] as [number, number];
          let currentStatus = v.status;
          let currentSpeed = v.speed;

          // 1. Check if vehicle is close to active incident (within ~1.2km / ~0.01 degrees)
          if (activeIncidentCoords) {
            const [incLat, incLng] = activeIncidentCoords;
            const dist = Math.sqrt(
              Math.pow(currentCoords[0] - incLng, 2) + Math.pow(currentCoords[1] - incLat, 2)
            );

            if (dist < 0.012) {
              if (detourCoords && detourCoords.length > 0) {
                // Reroute active fleet along the detour path
                currentStatus = "rerouted";
                currentSpeed = Math.max(15, v.speed * 0.6); // slower speeds during detour
                
                // Slowly guide vehicle towards the closest point on the detour path, then follow it
                const closestPoint = detourCoords.reduce((prevPt, currPt) => {
                  const dPrev = Math.sqrt(Math.pow(currentCoords[0] - prevPt[0], 2) + Math.pow(currentCoords[1] - prevPt[1], 2));
                  const dCurr = Math.sqrt(Math.pow(currentCoords[0] - currPt[0], 2) + Math.pow(currentCoords[1] - currPt[1], 2));
                  return dCurr < dPrev ? currPt : prevPt;
                });

                // Lerp towards closest point
                currentCoords[0] += (closestPoint[0] - currentCoords[0]) * 0.15;
                currentCoords[1] += (closestPoint[1] - currentCoords[1]) * 0.15;
              } else {
                // Delay if no detour plan is active
                currentStatus = "delayed";
                currentSpeed = Math.max(5, v.speed * 0.15); // near standstill
              }
            } else {
              currentStatus = "active";
            }
          } else {
            currentStatus = "active";
          }

          // 2. Normal drift simulation (simulate slow road traversal)
          if (currentStatus !== "rerouted") {
            const rad = (v.heading * Math.PI) / 180;
            // Scale movement factor by speed
            const speedFactor = 0.00004 * (currentSpeed / 30);
            currentCoords[0] += Math.sin(rad) * speedFactor;
            currentCoords[1] += Math.cos(rad) * speedFactor;

            // Occasional direction changes or wrapping within Bengaluru area boundaries
            let heading = v.heading;
            if (Math.random() < 0.05) {
              heading = (heading + (Math.random() * 60 - 30) + 360) % 360;
            }

            // Boundary wrap limits around greater Bengaluru (roughly 12.85 to 13.08, 77.5 to 77.75)
            if (currentCoords[1] < 12.80 || currentCoords[1] > 13.10) heading = (heading + 180) % 360;
            if (currentCoords[0] < 77.48 || currentCoords[0] > 77.78) heading = (heading + 180) % 360;

            return {
              ...v,
              coordinates: currentCoords,
              status: currentStatus,
              speed: currentSpeed,
              heading,
            };
          } else {
            return {
              ...v,
              coordinates: currentCoords,
              status: currentStatus,
              speed: currentSpeed,
            };
          }
        })
      );
    }, 1200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeIncidentCoords, detourCoords]);

  // Log summary reports on state changes
  const lastIncidentState = useRef<boolean>(false);
  useEffect(() => {
    if (activeIncidentCoords && !lastIncidentState.current) {
      if (logMessage) {
        logMessage("[WARN] FLIPKART FLEET TRANSIT ROUTE DETECTED IN THREAT SHADOW", "warn");
      }
      lastIncidentState.current = true;
    } else if (!activeIncidentCoords && lastIncidentState.current) {
      if (logMessage) {
        logMessage("[INFO] FLEET ROUTING PATH NORMALIZED", "info");
      }
      lastIncidentState.current = false;
    }
  }, [activeIncidentCoords, logMessage]);

  return { vehicles };
};
