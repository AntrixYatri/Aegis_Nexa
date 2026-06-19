import React, { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { ScatterplotLayer, PolygonLayer, PathLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createHistoricalRiskLayer } from './HistoricalRiskLayer';

interface MapContainerProps {
  simulationPhase: 1 | 2 | 3 | 4;
  activeIncident: any;
  simulationResult: any;
  onLogMessage?: (
    msg: string,
    type: 'info' | 'warn' | 'critical' | 'success'
  ) => void;
  showHistoricalRisk?: boolean;
  historicalRiskData?: any[];
}

// Utility to generate a circle polygon array of coordinates
function getCirclePolygon(lng: number, lat: number, radiusMeters: number, sides = 32) {
  const points = [];
  const km = radiusMeters / 1000;
  const latFactor = 1 / 111.32;
  const lngFactor = 1 / (111.32 * Math.cos(lat * Math.PI / 180));

  for (let i = 0; i <= sides; i++) {
    const angle = (i * 2 * Math.PI) / sides;
    const dx = km * Math.cos(angle);
    const dy = km * Math.sin(angle);
    points.push([
      lng + dx * lngFactor,
      lat + dy * latFactor
    ]);
  }
  return points;
}

// Utility to generate animated rotated boundary dots coordinates
function getCirclePolygonPoints(lng: number, lat: number, radiusMeters: number, sides = 24, angleOffset = 0) {
  const points = [];
  const km = radiusMeters / 1000;
  const latFactor = 1 / 111.32;
  const lngFactor = 1 / (111.32 * Math.cos(lat * Math.PI / 180));

  for (let i = 0; i < sides; i++) {
    const angle = ((i * 2 * Math.PI) / sides) + angleOffset;
    const dx = km * Math.cos(angle);
    const dy = km * Math.sin(angle);
    points.push([
      lng + dx * lngFactor,
      lat + dy * latFactor
    ]);
  }
  return points;
}

// Interpolates a coordinate at fraction t (0 to 1) along a multi-segment line path
function getPointOnPath(path: [number, number][], t: number): [number, number] {
  if (path.length < 2) return path[0] || [0, 0];
  const n = path.length - 1;
  const segment = Math.floor(t * n);
  const fraction = (t * n) - segment;
  if (segment >= n) return path[n];
  const p1 = path[segment];
  const p2 = path[segment + 1];
  return [
    p1[0] + (p2[0] - p1[0]) * fraction,
    p1[1] + (p2[1] - p1[1]) * fraction
  ];
}

// Generates a stable, deterministic coordinate offset for OSM node IDs
function getDeterministicOffset(nodeId: number, radiusMeters: number, lat: number) {
  const angle = (nodeId % 360) * Math.PI / 180;
  // Distribute between 15% and 85% of the risk radius
  const seedDistance = Math.abs(Math.sin(nodeId)) * 0.7 + 0.15;
  const distanceKm = (radiusMeters * seedDistance) / 1000;

  const latFactor = 1 / 111.32;
  const lngFactor = 1 / (111.32 * Math.cos(lat * Math.PI / 180));

  return {
    dLng: distanceKm * Math.cos(angle) * lngFactor,
    dLat: distanceKm * Math.sin(angle) * latFactor
  };
}

export default function MapContainer({
  simulationPhase,
  activeIncident,
  simulationResult,
  onLogMessage,
  showHistoricalRisk,
  historicalRiskData
}: MapContainerProps) {
  const [viewState, setViewState] = useState({
    longitude: 77.5946,
    latitude: 12.9716,
    zoom: 12.5,
    pitch: 45,
    bearing: -15
  });

  // Pulse animation loop
  const [pulseRadius, setPulseRadius] = useState(0);

  useEffect(() => {
    let animId: number;
    const tick = () => {
      setPulseRadius((prev) => (prev + 0.8) % 100);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Incident Focus Animation (cinematic fly-to focus)
  const lastFlownIncidentIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (activeIncident && activeIncident.latitude && activeIncident.longitude) {
      if (activeIncident.id !== lastFlownIncidentIdRef.current) {
        lastFlownIncidentIdRef.current = activeIncident.id;
        setViewState({
          longitude: activeIncident.longitude,
          latitude: activeIncident.latitude,
          zoom: 13,
          pitch: 50,
          bearing: -15,
          // @ts-ignore
          transitionDuration: 1200,
          transitionInterpolator: new FlyToInterpolator()
        });
      }
    }
  }, [activeIncident?.id, activeIncident?.latitude, activeIncident?.longitude]);

  // Deck.gl layers calculation
  const layers = [];

  if (showHistoricalRisk && historicalRiskData && historicalRiskData.length > 0) {
    layers.push(createHistoricalRiskLayer(historicalRiskData));
  }

  if (activeIncident && activeIncident.latitude && activeIncident.longitude) {
    const lng = activeIncident.longitude;
    const lat = activeIncident.latitude;

    const incidentData = {
      latitude: lat,
      longitude: lng,
      severity: activeIncident.severity,
    };

    // Feature 1: Pulsing incident marker (Red core, Cyan outer pulsing ring)
    // Red core ScatterplotLayer (small red core)
    layers.push(
      new ScatterplotLayer({
        id: 'incident-core',
        data: [incidentData],
        getPosition: (d: any) => [d.longitude, d.latitude],
        getRadius: 3.5,
        radiusUnits: 'pixels',
        getFillColor: [255, 59, 59, 255],
        pickable: false,
      })
    );

    // Cyan outer pulsing thin ring (stroked outline only, no fill)
    layers.push(
      new ScatterplotLayer({
        id: 'incident-pulse-outer',
        data: [incidentData],
        getPosition: (d: any) => [d.longitude, d.latitude],
        getRadius: 1,
        radiusUnits: 'pixels',
        radiusScale: 8 + pulseRadius * 0.3, // size ranges from 8 to 38px
        stroked: true,
        filled: false,
        getLineColor: [0, 229, 255, Math.floor(200 * (1 - pulseRadius / 100))],
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        pickable: false,
      })
    );

    // Feature 3: Concentric Layered Containment Zones (Red -> Amber -> Green)
    if (simulationResult && simulationResult.blast_radius_meters) {
      const baseRadius = simulationResult.blast_radius_meters;

      // Zone 3: Green Containment Area (Outer bounds, radius = baseRadius * 1.5)
      layers.push(
        new ScatterplotLayer({
          id: 'containment-zone-3-green',
          data: [incidentData],
          getPosition: (d: any) => [d.longitude, d.latitude],
          getRadius: baseRadius * 1.5,
          radiusUnits: 'meters',
          getFillColor: [16, 185, 129, 6], // ~2.5% opacity green
          stroked: true,
          getLineColor: [16, 185, 129, 40],
          getLineWidth: 1,
          pickable: false,
        })
      );

      // Zone 2: Amber Mitigation Buffer (Middle bounds, radius = baseRadius * 1.0)
      layers.push(
        new ScatterplotLayer({
          id: 'containment-zone-2-amber',
          data: [incidentData],
          getPosition: (d: any) => [d.longitude, d.latitude],
          getRadius: baseRadius,
          radiusUnits: 'meters',
          getFillColor: [245, 158, 11, 10], // ~4% opacity amber
          stroked: true,
          getLineColor: [245, 158, 11, 50],
          getLineWidth: 1,
          pickable: false,
        })
      );

      // Zone 1: Red Isolation Zone (Inner core danger, radius = baseRadius * 0.5)
      layers.push(
        new ScatterplotLayer({
          id: 'containment-zone-1-red',
          data: [incidentData],
          getPosition: (d: any) => [d.longitude, d.latitude],
          getRadius: baseRadius * 0.5,
          radiusUnits: 'meters',
          getFillColor: [255, 59, 59, 15], // ~6% opacity red
          stroked: true,
          getLineColor: [255, 59, 59, 70],
          getLineWidth: 1,
          pickable: false,
        })
      );
    }

    // Phase 1 Quarantine containment perimeter (visible when phase >= 2)
    if (simulationPhase >= 2 && simulationResult && simulationResult.blast_radius_meters) {
      const perimeterRadius = simulationResult.blast_radius_meters * 1.25;
      const staticPolygon = getCirclePolygon(lng, lat, perimeterRadius);

      // Cordon perimeter polygon (rgba(255,59,59,0.08) fill & very thin outline)
      layers.push(
        new PolygonLayer({
          id: 'quarantine-cordon-polygon',
          data: [{ polygon: staticPolygon }],
          getPolygon: (d: any) => d.polygon,
          filled: true,
          stroked: true,
          getFillColor: [255, 59, 59, 20], // rgba(255,59,59,0.08)
          getLineColor: [255, 59, 59, 80],
          getLineWidth: 1,
          lineWidthMinPixels: 1,
          pickable: false,
        })
      );

      // Rotating dashed boundary dots (represents animated cordon perimeter)
      const animatedPoints = getCirclePolygonPoints(
        lng,
        lat,
        perimeterRadius,
        28, // number of dots/segments
        pulseRadius * 0.03 // angle offset rotates slowly over time
      );

      layers.push(
        new ScatterplotLayer({
          id: 'quarantine-cordon-dots',
          data: animatedPoints.map((p) => ({ position: p })),
          getPosition: (d: any) => d.position,
          getRadius: 4,
          radiusUnits: 'pixels',
          getFillColor: [255, 59, 59, 230], // solid red cordon boundary indicator
          pickable: false,
        })
      );
    }

    // Feature 4: ST-GNN Node Visualization (Blinking node indicators on affected intersections)
    try {
      if (simulationResult && simulationResult.impacted_nodes && simulationResult.impacted_nodes.length > 0) {
        const nodesData = simulationResult.impacted_nodes.map((node: any, idx: number) => {
          // Robust mapping of coordinates from the backend data contract
          const nodeLat = node.latitude;
          const nodeLng = node.longitude;
          const riskScore = node.risk_score || 50;
          return {
            id: idx,
            position: [nodeLng, nodeLat],
            riskScore: riskScore
          };
        }).filter((n: any) => !isNaN(n.position[0]) && !isNaN(n.position[1]));

        layers.push(
          new ScatterplotLayer({
            id: 'st-gnn-impacted-nodes',
            data: nodesData,
            getPosition: (d: any) => d.position,
            // Scale size of Scatterplot markers according to risk_score metric
            getRadius: (d: any) => 3 + (d.riskScore * 0.12),
            radiusUnits: 'pixels',
            // Scale color palette dynamically using risk_score (interpolate Amber -> Red)
            getFillColor: (d: any) => {
              const ratio = Math.min(1, Math.max(0, d.riskScore / 100));
              const r = Math.round(245 + (255 - 245) * ratio);
              const g = Math.round(158 + (59 - 158) * ratio);
              const b = Math.round(11 + (59 - 11) * ratio);
              const alpha = Math.sin(pulseRadius * 0.25) > 0 ? 230 : 60;
              return [r, g, b, alpha];
            },
            stroked: true,
            getLineColor: (d: any) => {
              const ratio = Math.min(1, Math.max(0, d.riskScore / 100));
              const r = Math.round(245 + (255 - 245) * ratio);
              const g = Math.round(158 + (59 - 158) * ratio);
              const b = Math.round(11 + (59 - 11) * ratio);
              return [r, g, b, 255];
            },
            getLineWidth: 1,
            pickable: true,
          })
        );
      }
    } catch (err: any) {
      console.warn("Cordon zone impacted nodes mapping failed:", err);
      if (onLogMessage) {
        onLogMessage(`[WARN] Cordon node visualization mismatch: ${err.message}`, 'warn');
      }
    }

    // New ST-GNN impacted nodes overlay layer (minimal, driven by simulationResult.impacted_nodes)
    try {
      if (simulationResult && simulationResult.impacted_nodes && simulationResult.impacted_nodes.length > 0) {
        layers.push(
          new ScatterplotLayer({
            id: 'st-gnn-impacted-nodes-overlay',
            data: simulationResult.impacted_nodes,
            getPosition: (d: any) => [d.longitude, d.latitude],
            getRadius: (d: any) => d.risk_score || 0,
            radiusScale: 0.35, // scale factor to size appropriately
            radiusUnits: 'pixels',
            radiusMinPixels: 4,
            radiusMaxPixels: 8,
            getFillColor: [255, 69, 0, 220], // glowing red/orange (OrangeRed)
            getLineColor: [255, 140, 0, 255], // bright orange outline
            stroked: true,
            filled: true,
            getLineWidth: 1,
            lineWidthMinPixels: 1,
            pickable: true,
          })
        );
      }
    } catch (err: any) {
      console.warn("ST-GNN node overlay layer failed to load:", err);
      if (onLogMessage) {
        onLogMessage(`[WARN] ST-GNN node overlay error: ${err.message}`, 'warn');
      }
    }

    // Feature 1: Dynamic Diversion Corridors (Alternative paths loop with BPR flow allocation)
    try {
      if (simulationPhase >= 3 && simulationResult && simulationResult.detour_geometry && simulationResult.detour_geometry.length > 0) {
        simulationResult.detour_geometry.forEach((route: any, idx: number) => {
          const flow = route.flow_allocation_percentage || 30;
          const coords = route.coordinates;

          if (!coords || coords.length < 2) return;

          // Adjust line width/stroke based on flow_allocation_percentage metric
          const pathWidth = 2.5 + (flow * 0.08);

          // Assign distinct dynamic colors based on route hierarchy and flow allocations
          let strokeColor = [0, 229, 255, 220]; // Default prediction cyan
          if (route.route_index === 1) {
            strokeColor = [16, 185, 129, 200]; // Emerald green diversion corridor
          } else if (route.route_index === 2) {
            strokeColor = [245, 158, 11, 180]; // Amber mitigation route
          }

          // Renders routing path segments on MapLibre vector canvas
          layers.push(
            new PathLayer({
              id: `detour-path-${route.route_index}-${idx}`,
              data: [route],
              getPath: (d: any) => d.coordinates,
              getColor: strokeColor,
              getWidth: pathWidth,
              widthMinPixels: 2.5,
              pickable: true,
            })
          );

          // Render moving vehicle/telemetry animation markers matching BPR splits
          const numVehicles = Math.max(1, Math.floor(flow / 10)); // e.g. 50% flow split generates 5 cars
          const vehicles = Array.from({ length: numVehicles }).map((_, vIdx) => {
            const t = ((pulseRadius + vIdx * (100 / numVehicles)) % 100) / 100;
            return {
              position: getPointOnPath(coords, t)
            };
          });

          layers.push(
            new ScatterplotLayer({
              id: `fleet-vehicles-route-${route.route_index}-${idx}`,
              data: vehicles,
              getPosition: (d: any) => d.position,
              getRadius: 5,
              radiusUnits: 'pixels',
              getFillColor: strokeColor,
              stroked: true,
              getLineColor: [0, 0, 0, 255],
              getLineWidth: 1.5,
              pickable: false,
            })
          );
        });
      } else if (simulationPhase >= 3) {
        // Safe static path fallbacks if dynamic OSMnx routing dataset fails or is pending
        const affectedPath = [
          [lng - 0.005, lat - 0.003],
          [lng - 0.002, lat - 0.001],
          [lng, lat]
        ] as [number, number][];

        const diversionPath = [
          [lng - 0.005, lat - 0.003],
          [lng - 0.004, lat + 0.002],
          [lng, lat + 0.004],
          [lng + 0.004, lat + 0.002],
          [lng + 0.005, lat]
        ] as [number, number][];

        layers.push(
          new PathLayer({
            id: 'affected-corridor-fallback',
            data: [{ path: affectedPath }],
            getPath: (d: any) => d.path,
            getColor: [255, 59, 59, 200],
            getWidth: 4,
            widthMinPixels: 2.5,
            pickable: false,
          })
        );

        layers.push(
          new PathLayer({
            id: 'diversion-corridor-fallback',
            data: [{ path: diversionPath }],
            getPath: (d: any) => d.path,
            getColor: [16, 185, 129, 200],
            getWidth: 4,
            widthMinPixels: 2.5,
            pickable: false,
          })
        );
      }
    } catch (err: any) {
      console.warn("Alternative routing paths mapping failed:", err);
      if (onLogMessage) {
        onLogMessage(`[WARN] Detour paths compilation error: ${err.message}`, 'warn');
      }
    }
  }

  return (
    <div className="w-full h-full min-h-[350px] md:min-h-[450px] lg:min-h-[500px] xl:min-h-[550px] bg-[#050507] relative">
      {/* Main synchronized Deck.GL + MapLibre stack */}
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
        style={{ width: '100%', height: '100%' }}
      >
        <Map
          mapLib={maplibregl}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          style={{ width: '100%', height: '100%' }}
        />
      </DeckGL>
    </div>
  );
}