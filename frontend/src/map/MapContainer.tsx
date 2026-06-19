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
  timelineStage: number;
  networkMode: 'current' | 'mitigated';
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

// Interpolates a coordinate at fraction t (0 to 1) along a multi-segment line path based on cumulative distance (premium)
function getPointOnPath(path: [number, number][], t: number): [number, number] {
  if (path.length === 0) return [0, 0];
  if (path.length === 1) return path[0];

  // 1. Calculate segment lengths and cumulative sum
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    const dist = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);
    segmentLengths.push(dist);
    totalLength += dist;
  }

  if (totalLength === 0) return path[0];

  // 2. Determine target cumulative distance
  const targetDistance = t * totalLength;

  // 3. Find the segment where the target distance falls
  let accumulatedDistance = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segmentLength = segmentLengths[i];
    if (accumulatedDistance + segmentLength >= targetDistance) {
      const segmentFraction = segmentLength === 0 ? 0 : (targetDistance - accumulatedDistance) / segmentLength;
      const p1 = path[i];
      const p2 = path[i + 1];
      return [
        p1[0] + (p2[0] - p1[0]) * segmentFraction,
        p1[1] + (p2[1] - p1[1]) * segmentFraction
      ];
    }
    accumulatedDistance += segmentLength;
  }

  return path[path.length - 1];
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

// Generates an irregular organic polygon enclosing the impacted nodes instead of a perfect circle
function getOrganicPerimeter(lng: number, lat: number, nodes: any[], baseRadius: number) {
  const points = [];
  const numSides = 16;
  
  // Calculate relative distances for each angle to form an organic shape snapped to nodes
  for (let i = 0; i <= numSides; i++) {
    const angle = (i * 2 * Math.PI) / numSides;
    let maxDist = baseRadius * 0.7; // baseline radius (70% of blast radius)
    
    if (nodes && nodes.length > 0) {
      nodes.forEach(node => {
        const nodeLat = node.latitude || node.lat;
        const nodeLng = node.longitude || node.lng;
        if (nodeLat && nodeLng) {
          const dy = nodeLat - lat;
          const dx = nodeLng - lng;
          const nodeAngle = Math.atan2(dy, dx);
          
          // Angular difference wrapped between -PI and PI
          const angleDiff = Math.abs(Math.atan2(Math.sin(angle - nodeAngle), Math.cos(angle - nodeAngle)));
          if (angleDiff < Math.PI / numSides) {
            // Snaps perimeter towards this node distance
            const dLat = nodeLat - lat;
            const dLng = nodeLng - lng;
            // Simple flat earth approximation in meters (1 deg lat = 111320m)
            const dist = Math.sqrt((dLat * 111320) ** 2 + (dLng * 111320 * Math.cos(lat * Math.PI / 180)) ** 2);
            if (dist > maxDist) {
              maxDist = dist;
            }
          }
        }
      });
    }
    
    // Bounds check to keep shape realistic and organic
    maxDist = Math.min(baseRadius * 1.6, Math.max(baseRadius * 0.55, maxDist * 1.15));
    
    const km = maxDist / 1000;
    const latFactor = 1 / 111.32;
    const lngFactor = 1 / (111.32 * Math.cos(lat * Math.PI / 180));
    points.push([
      lng + km * Math.cos(angle) * lngFactor,
      lat + km * Math.sin(angle) * latFactor
    ]);
  }
  return points;
}

export default function MapContainer({
  simulationPhase,
  activeIncident,
  simulationResult,
  onLogMessage,
  showHistoricalRisk,
  historicalRiskData,
  timelineStage,
  networkMode
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

    // Severity Node Hierarchy style helper
    const getSeverityStyle = (riskScore: number, pulseRad: number) => {
      if (networkMode === 'mitigated') {
        // Mitigated: soft cyan/yellow colors with lower opacity/radii
        if (riskScore >= 60) {
          return {
            color: [230, 240, 100], // Soft yellow/cyan mix
            radius: 3.5,
            pulse: 1.0
          };
        } else {
          return {
            color: [0, 200, 220], // Soft cyan
            radius: 2.5,
            pulse: 1.0
          };
        }
      } else {
        // Current unmitigated network
        if (riskScore >= 85) { // Critical
          return {
            color: [255, 30, 30], // Red
            radius: 7.0,
            pulse: 1.5 + Math.sin(pulseRad * 0.3) * 0.4
          };
        } else if (riskScore >= 60) { // High
          return {
            color: [255, 120, 0], // Orange
            radius: 5.5,
            pulse: 1.2 + Math.sin(pulseRad * 0.2) * 0.2
          };
        } else if (riskScore >= 35) { // Moderate
          return {
            color: [255, 210, 0], // Yellow
            radius: 4.0,
            pulse: 1.0
          };
        } else { // Low
          return {
            color: [0, 229, 255], // Cyan
            radius: 3.0,
            pulse: 1.0
          };
        }
      }
    };

    // Feature 3: Concentric Layered Containment Zones (Red -> Amber -> Green)
    // Upgraded to organic topology-driven polygons wrapping the active threat nodes
    if (simulationResult && simulationResult.blast_radius_meters && timelineStage >= 3) {
      const baseRadius = simulationResult.blast_radius_meters;
      const nodes = simulationResult.impacted_nodes || [];

      // Generate organic shapes based on actual threat coordinates
      const outerPolygon = getOrganicPerimeter(lng, lat, nodes, baseRadius * 1.5);
      const middlePolygon = getOrganicPerimeter(lng, lat, nodes, baseRadius * 1.0);
      const innerPolygon = getOrganicPerimeter(lng, lat, nodes, baseRadius * 0.5);

      // Zone 3: Green Containment Area (Outer bounds)
      layers.push(
        new PolygonLayer({
          id: 'containment-zone-3-green',
          data: [{ polygon: outerPolygon }],
          getPolygon: (d: any) => d.polygon,
          filled: true,
          stroked: true,
          getFillColor: [16, 185, 129, 5], // soft transparent green
          getLineColor: [16, 185, 129, 30],
          getLineWidth: 1,
          pickable: false,
        })
      );

      // Zone 2: Amber Mitigation Buffer (Middle bounds)
      layers.push(
        new PolygonLayer({
          id: 'containment-zone-2-amber',
          data: [{ polygon: middlePolygon }],
          getPolygon: (d: any) => d.polygon,
          filled: true,
          stroked: true,
          getFillColor: [245, 158, 11, 7], // soft transparent amber
          getLineColor: [245, 158, 11, 40],
          getLineWidth: 1,
          pickable: false,
        })
      );

      // Zone 1: Red Isolation Zone (Inner danger bounds)
      layers.push(
        new PolygonLayer({
          id: 'containment-zone-1-red',
          data: [{ polygon: innerPolygon }],
          getPolygon: (d: any) => d.polygon,
          filled: true,
          stroked: true,
          getFillColor: [255, 59, 59, 10], // soft transparent red
          getLineColor: [255, 59, 59, 50],
          getLineWidth: 1,
          pickable: false,
        })
      );
    }

    // Phase 1 Quarantine containment perimeter (visible when phase >= 2 and timelineStage >= 3)
    if (simulationPhase >= 2 && simulationResult && simulationResult.blast_radius_meters && timelineStage >= 3) {
      const perimeterRadius = simulationResult.blast_radius_meters * 1.25;
      const staticPolygon = getOrganicPerimeter(lng, lat, simulationResult.impacted_nodes || [], perimeterRadius);

      // Cordon perimeter polygon
      layers.push(
        new PolygonLayer({
          id: 'quarantine-cordon-polygon',
          data: [{ polygon: staticPolygon }],
          getPolygon: (d: any) => d.polygon,
          filled: true,
          stroked: true,
          getFillColor: [255, 59, 59, 12], // organic translucent red
          getLineColor: [255, 59, 59, 60],
          getLineWidth: 1.5,
          lineWidthMinPixels: 1,
          pickable: false,
        })
      );

      // Rotating dashed boundary dots (represents animated cordon perimeter on vertices)
      const animatedPoints = staticPolygon.slice(0, -1);
      layers.push(
        new ScatterplotLayer({
          id: 'quarantine-cordon-dots',
          data: animatedPoints.map((p) => ({ position: p })),
          getPosition: (d: any) => d.position,
          getRadius: 4.5,
          radiusUnits: 'pixels',
          getFillColor: [255, 59, 59, Math.round(180 + Math.sin(pulseRadius * 0.25) * 50)],
          pickable: false,
        })
      );
    }

    // Feature 4: ST-GNN Node Visualization (Blinking node indicators on affected intersections)
    try {
      if (simulationResult && simulationResult.impacted_nodes && simulationResult.impacted_nodes.length > 0 && timelineStage >= 1) {
        // Sort nodes by distance from the epicenter for smooth outward propagation wave animation
        const sortedNodes = [...simulationResult.impacted_nodes].sort((a: any, b: any) => {
          const distA = (a.latitude - lat) ** 2 + (a.longitude - lng) ** 2;
          const distB = (b.latitude - lat) ** 2 + (b.longitude - lng) ** 2;
          return distA - distB;
        });

        // Slice data based on causal timeline stage
        let visibleNodes: any[] = [];
        if (timelineStage === 1) {
          visibleNodes = sortedNodes.slice(0, 1);
        } else if (timelineStage === 2) {
          visibleNodes = sortedNodes.slice(0, Math.max(1, Math.ceil(sortedNodes.length * 0.35)));
        } else if (timelineStage === 3) {
          visibleNodes = sortedNodes.slice(0, Math.max(1, Math.ceil(sortedNodes.length * 0.70)));
        } else {
          visibleNodes = sortedNodes;
        }

        const nodesData = visibleNodes.map((node: any, idx: number) => {
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
            getRadius: (d: any) => {
              const style = getSeverityStyle(d.riskScore, pulseRadius);
              return style.radius * style.pulse;
            },
            radiusUnits: 'pixels',
            radiusMinPixels: 3,
            radiusMaxPixels: 15,
            getFillColor: (d: any) => {
              const style = getSeverityStyle(d.riskScore, pulseRadius);
              const baseAlpha = networkMode === 'mitigated' ? 70 : 200;
              const alpha = d.riskScore >= 85 && networkMode === 'current'
                ? (Math.sin(pulseRadius * 0.3) > 0 ? 245 : 90)
                : baseAlpha;
              return style.color.concat([alpha]);
            },
            stroked: true,
            getLineColor: (d: any) => {
              const style = getSeverityStyle(d.riskScore, pulseRadius);
              return style.color.concat([255]);
            },
            getLineWidth: 1.5,
            pickable: true,
          })
        );
 
        // ST-GNN Node secondary halo overlay
        layers.push(
          new ScatterplotLayer({
            id: 'st-gnn-impacted-nodes-overlay',
            data: visibleNodes,
            getPosition: (d: any) => [d.longitude, d.latitude],
            getRadius: (d: any) => {
              const style = getSeverityStyle(d.risk_score || 50, pulseRadius);
              return style.radius * 2.2;
            },
            radiusUnits: 'pixels',
            radiusMinPixels: 5,
            radiusMaxPixels: 28,
            getFillColor: (d: any) => {
              const style = getSeverityStyle(d.risk_score || 50, pulseRadius);
              const baseAlpha = networkMode === 'mitigated' ? 15 : 40;
              const alpha = Math.round(baseAlpha + Math.sin(pulseRadius * 0.2) * 10);
              return style.color.concat([alpha]);
            },
            stroked: false,
            filled: true,
            pickable: false,
          })
        );
      }
    } catch (err: any) {
      console.warn("Cordon zone impacted nodes mapping failed:", err);
      if (onLogMessage) {
        onLogMessage(`[WARN] Cordon node visualization mismatch: ${err.message}`, 'warn');
      }
    }

    // Feature 1: Dynamic Diversion Corridors (Alternative paths loop with BPR flow allocation)
    try {
      if (networkMode === 'mitigated' && simulationPhase >= 3 && simulationResult && simulationResult.detour_geometry && simulationResult.detour_geometry.length > 0 && timelineStage >= 5) {
        simulationResult.detour_geometry.forEach((route: any, idx: number) => {
          const flow = route.flow_allocation_percentage || 30;
          const coords = route.coordinates;

          if (!coords || coords.length < 2) return;

          // Opacity and color based on allocation visual hierarchy
          const opacity = Math.round(130 + (flow / 100) * 125); // 50% => 192, 20% => 155
          let strokeColor = [0, 229, 255, opacity]; // Default cyan
          if (route.route_index === 1) {
            strokeColor = [16, 185, 129, opacity]; // Emerald green diversion corridor
          } else if (route.route_index === 2) {
            strokeColor = [245, 158, 11, opacity]; // Amber mitigation route
          }

          // Rerouting Widths: Primary = 8.5px, Secondary = 5.5px, Tertiary = 3.5px
          let pathWidth = 3.5;
          if (route.route_index === 0) {
            pathWidth = 8.5;
          } else if (route.route_index === 1) {
            pathWidth = 5.5;
          }

          // 1. Glow Under-Layer (strong glowing aura)
          layers.push(
            new PathLayer({
              id: `detour-path-glow-${route.route_index}-${idx}`,
              data: [route],
              getPath: (d: any) => d.coordinates,
              getColor: strokeColor.slice(0, 3).concat([Math.round(40 + Math.sin(pulseRadius * 0.15) * 15)]),
              getWidth: pathWidth * 1.8 + Math.sin(pulseRadius * 0.1) * 1.2,
              widthMinPixels: 4,
              pickable: false,
            })
          );

          // 2. Core Over-Layer (crisp neon core)
          layers.push(
            new PathLayer({
              id: `detour-path-core-${route.route_index}-${idx}`,
              data: [route],
              getPath: (d: any) => d.coordinates,
              getColor: strokeColor.slice(0, 3).concat([240]),
              getWidth: pathWidth,
              widthMinPixels: 2.5,
              pickable: true,
            })
          );

          // Render moving vehicle indicators ONLY at stage 6
          if (timelineStage >= 6) {
            // Map route index to traffic_condition string for speed multipliers
            let trafficCondition = 'normal';
            if (route.route_index === 0) {
              trafficCondition = 'congested';
            } else if (route.route_index === 2) {
              trafficCondition = 'free-flow';
            }

            const speedMultipliers: Record<string, number> = {
              'congested': 0.25,
              'normal': 0.6,
              'free-flow': 1.2
            };

            const speedMultiplier = speedMultipliers[trafficCondition];

            // Traffic density vehicle indicators proportional to allocation splits
            const numVehicles = flow >= 50 ? 10 : flow >= 30 ? 6 : 4;
            const trailLength = 4;
            const vehiclesData: any[] = [];

            for (let vIdx = 0; vIdx < numVehicles; vIdx++) {
              const baseT = ((pulseRadius * speedMultiplier + vIdx * (100 / numVehicles)) % 100) / 100;
              
              for (let trailIdx = 0; trailIdx < trailLength; trailIdx++) {
                // Calculate coordinate with time offset for the trail
                const t = (baseT - (trailIdx * 0.015) + 1.0) % 1.0;
                vehiclesData.push({
                  position: getPointOnPath(coords, t),
                  size: 4.5 - trailIdx * 0.9, // core is 4.5px, trail decays to 0.9px
                  opacity: Math.max(0, Math.round(255 * (1 - trailIdx / trailLength))),
                  isCore: trailIdx === 0
                });
              }
            }

            layers.push(
              new ScatterplotLayer({
                id: `fleet-vehicles-route-${route.route_index}-${idx}`,
                data: vehiclesData,
                getPosition: (d: any) => d.position,
                getRadius: (d: any) => d.size,
                radiusUnits: 'pixels',
                getFillColor: (d: any) => {
                  // Core is solid bright white, trails match the route color with decaying opacity
                  return d.isCore ? [255, 255, 255, d.opacity] : strokeColor.slice(0, 3).concat([d.opacity]);
                },
                stroked: false,
                pickable: false,
              })
            );
          }
        });
      } else if (networkMode === 'mitigated' && simulationPhase >= 3) {
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