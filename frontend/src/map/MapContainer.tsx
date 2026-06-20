import React, { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import Map from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import { ScatterplotLayer, PolygonLayer, PathLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { FlyToInterpolator } from '@deck.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createHistoricalRiskLayer } from './HistoricalRiskLayer';

// Define DEBUG_MODE flag (can be toggled via window.DEBUG_MODE in browser console for development)
const getDebugMode = (): boolean => {
  if (typeof window !== 'undefined') {
    return (window as any).DEBUG_MODE === true;
  }
  return false;
};

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
  const SHOW_VEHICLES = false;
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
    const severity = activeIncident.severity || 5;

    let nodesData: any[] = [];
    let criticalNodes: any[] = [];
    let propagationEdges: any[] = [];

    if (simulationResult && simulationResult.impacted_nodes && simulationResult.impacted_nodes.length > 0 && timelineStage >= 1) {
      try {
        const sortedNodes = [...simulationResult.impacted_nodes].sort((a: any, b: any) => {
          const distA = (a.latitude - lat) ** 2 + (a.longitude - lng) ** 2;
          const distB = (b.latitude - lat) ** 2 + (b.longitude - lng) ** 2;
          return distA - distB;
        });

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

        nodesData = visibleNodes.map((node: any, idx: number) => {
          const nodeLat = node.latitude;
          const nodeLng = node.longitude;
          const riskScore = node.risk_score || 50;
          return {
            id: idx,
            position: [nodeLng, nodeLat],
            riskScore: riskScore
          };
        }).filter((n: any) => !isNaN(n.position[0]) && !isNaN(n.position[1]));

        // Sort by centrality: higher risk score first, closer to epicenter first
        criticalNodes = nodesData
          .map((node: any) => {
            const dist = Math.sqrt((node.position[1] - lat) ** 2 + (node.position[0] - lng) ** 2);
            const centralityScore = node.riskScore * 1.5 - dist * 1000;
            return {
              ...node,
              centralityScore,
              dist
            };
          })
          .sort((a: any, b: any) => b.centralityScore - a.centralityScore)
          .slice(0, 35)
          .map((node: any, rank: number) => ({
            ...node,
            rank
          }));

        // Compute edges between critical nodes
        criticalNodes.forEach((nodeA: any, i: number) => {
          const neighbors = criticalNodes
            .map((nodeB: any, j: number) => ({
              idx: j,
              node: nodeB,
              dist: (nodeA.position[1] - nodeB.position[1]) ** 2 + (nodeA.position[0] - nodeB.position[0]) ** 2
            }))
            .filter(item => item.idx !== i)
            .sort((a: any, b: any) => a.dist - b.dist)
            .slice(0, 2);
          
          neighbors.forEach(neighbor => {
            propagationEdges.push({
              from: nodeA.position,
              to: neighbor.node.position,
            });
          });
        });
      } catch (err) {
        console.warn("Spatiotemporal nodes pre-calculation error:", err);
      }
    }

    // Heatmap Layer (renders at zoom < 14.5 under DEBUG_MODE)
    if (getDebugMode() && viewState.zoom < 14.5 && nodesData.length > 0) {
      layers.push(
        new HeatmapLayer({
          id: 'st-gnn-heatmap',
          data: nodesData,
          getPosition: (d: any) => d.position,
          getWeight: (d: any) => d.riskScore,
          radiusPixels: 45,
          intensity: 1.5,
          threshold: 0.05,
          pickable: false,
        })
      );
    }

    const incidentData = {
      latitude: lat,
      longitude: lng,
      severity: severity,
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
        getFillColor: networkMode === 'mitigated' ? [180, 50, 50, 80] : [255, 59, 59, 255],
        pickable: false,
      })
    );

    if (networkMode !== 'mitigated') {
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
    }

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
    if (networkMode === 'current' && simulationResult && simulationResult.blast_radius_meters && timelineStage >= 3) {
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
    if (networkMode === 'current' && simulationPhase >= 2 && simulationResult && simulationResult.blast_radius_meters && timelineStage >= 3) {
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

    // Feature 4: ST-GNN Node Visualization (Heatmap at low zoom, Critical node markers and network edges at high zoom)
    // Renders nodes and network propagation lines ONLY in DEBUG_MODE (Goal 2: Remove Full Node Visualization)
    try {
      if (getDebugMode() && simulationResult && simulationResult.impacted_nodes && simulationResult.impacted_nodes.length > 0 && timelineStage >= 1) {
        
        // 1. Propagation Network Edges (PathLayer) - renders when zoomed in >= 13.5
        if (viewState.zoom >= 13.5 && propagationEdges.length > 0) {
          layers.push(
            new PathLayer({
              id: 'st-gnn-propagation-edges',
              data: propagationEdges,
              getPath: (d: any) => [d.from, d.to],
              getColor: [255, 59, 59, 45], // Faint red lines (opacity 45)
              getWidth: 1.5,
              widthMinPixels: 1,
              pickable: false,
            })
          );
        }

        // 2. Critical Node Markers (ScatterplotLayer) - renders when zoomed in >= 13.5
        if (viewState.zoom >= 13.5 && criticalNodes.length > 0) {
          layers.push(
            new ScatterplotLayer({
              id: 'st-gnn-impacted-nodes',
              data: criticalNodes,
              getPosition: (d: any) => d.position,
              getRadius: (d: any) => {
                const style = getSeverityStyle(d.riskScore, pulseRadius);
                // Scale radius by centrality rank: most critical is 1.25x, scaling down to 0.8x
                const rankFactor = 1.25 - (d.rank / 35.0) * 0.45;
                return style.radius * style.pulse * rankFactor;
              },
              radiusUnits: 'pixels',
              radiusMinPixels: 3.5,
              radiusMaxPixels: 18,
              getFillColor: (d: any) => {
                const style = getSeverityStyle(d.riskScore, pulseRadius);
                // Opacity scales by rank (most critical node has 100% of baseAlpha, scaling down to 40% for rank 35)
                const rankOpacityFactor = 1.0 - (d.rank / 35.0) * 0.6;
                const baseAlpha = networkMode === 'mitigated' ? 75 : 200;
                
                // If it is critical and unmitigated, add standard blinking pulse to alpha
                const alpha = d.riskScore >= 85 && networkMode === 'current'
                  ? (Math.sin(pulseRadius * 0.3) > 0 ? 245 : 90)
                  : baseAlpha;
                
                return style.color.concat([Math.round(alpha * rankOpacityFactor)]);
              },
              stroked: true,
              getLineColor: (d: any) => {
                const style = getSeverityStyle(d.riskScore, pulseRadius);
                const rankOpacityFactor = 1.0 - (d.rank / 35.0) * 0.6;
                return style.color.concat([Math.round(255 * rankOpacityFactor)]);
              },
              getLineWidth: 1.5,
              pickable: true,
            })
          );

          // 3. Critical Node Halo Overlay - renders when zoomed in >= 13.5
          layers.push(
            new ScatterplotLayer({
              id: 'st-gnn-impacted-nodes-overlay',
              data: criticalNodes,
              getPosition: (d: any) => d.position,
              getRadius: (d: any) => {
                const style = getSeverityStyle(d.riskScore, pulseRadius);
                const rankFactor = 1.25 - (d.rank / 35.0) * 0.45;
                return style.radius * 2.2 * rankFactor;
              },
              radiusUnits: 'pixels',
              radiusMinPixels: 5,
              radiusMaxPixels: 32,
              getFillColor: (d: any) => {
                const style = getSeverityStyle(d.riskScore, pulseRadius);
                const rankOpacityFactor = 1.0 - (d.rank / 35.0) * 0.6;
                const baseAlpha = networkMode === 'mitigated' ? 15 : 40;
                const alpha = Math.round(baseAlpha + Math.sin(pulseRadius * 0.2) * 10);
                return style.color.concat([Math.round(alpha * rankOpacityFactor)]);
              },
              stroked: false,
              filled: true,
              pickable: false,
            })
          );
        }
      }
    } catch (err: any) {
      console.warn("Cordon zone impacted nodes mapping failed:", err);
      if (onLogMessage) {
        onLogMessage(`[WARN] Cordon node visualization mismatch: ${err.message}`, 'warn');
      }
    }

    // Feature 5: Congested and impacted road corridors (Goal 3: Incident-Centric / Goal 1: Road-Following Route Rendering)
    if (simulationResult && simulationResult.congested_corridors && simulationResult.congested_corridors.length > 0) {
      if (networkMode === 'mitigated') {
        layers.push(
          new PathLayer({
            id: 'original-impacted-corridors-thin',
            data: simulationResult.congested_corridors,
            getPath: (d: any) => d.coordinates,
            getColor: [255, 30, 30, 90],
            getWidth: 1.5,
            widthMinPixels: 1.5,
            pickable: false,
          })
        );
      } else {
        // 1. Glow Layer (wide, low opacity, pulsing)
        layers.push(
          new PathLayer({
            id: 'congested-corridors-glow',
            data: simulationResult.congested_corridors,
            getPath: (d: any) => d.coordinates,
            getColor: (d: any) => {
              const score = d.risk_score || 50;
              let color = [0, 229, 255]; // default cyan
              if (score >= 100) color = [255, 30, 30]; // Red
              else if (score >= 80) color = [255, 90, 0]; // Orange-red
              else if (score >= 60) color = [255, 150, 0]; // Orange
              else if (score >= 35) color = [255, 215, 0]; // Yellow
              
              // Add subtle pulsing effect to the glow opacity
              const opacity = Math.round(35 + Math.sin(pulseRadius * 0.15) * 12);
              return color.concat([opacity]);
            },
            getWidth: (d: any) => {
              const score = d.risk_score || 50;
              if (score >= 100) return 11.0;
              if (score >= 80) return 9.0;
              if (score >= 60) return 7.0;
              if (score >= 35) return 5.0;
              return 3.6;
            },
            widthMinPixels: 2,
            pickable: false,
          })
        );

        // 2. Core Layer (narrow, high opacity)
        layers.push(
          new PathLayer({
            id: 'congested-corridors-core',
            data: simulationResult.congested_corridors,
            getPath: (d: any) => d.coordinates,
            getColor: (d: any) => {
              const score = d.risk_score || 50;
              let color = [0, 229, 255];
              if (score >= 100) color = [255, 30, 30];
              else if (score >= 80) color = [255, 90, 0];
              else if (score >= 60) color = [255, 150, 0];
              else if (score >= 35) color = [255, 215, 0];
              
              return color.concat([210]); // solid core opacity
            },
            getWidth: (d: any) => {
              const score = d.risk_score || 50;
              if (score >= 100) return 5.5;
              if (score >= 80) return 4.5;
              if (score >= 60) return 3.5;
              if (score >= 35) return 2.5;
              return 1.8;
            },
            widthMinPixels: 1,
            pickable: true,
          })
        );
      }
    }

    // Feature 1: Mitigation Corridors (Cyan = redistributed traffic) & Recovery Corridors (Green = congestion relief)
    try {
      if (networkMode === 'mitigated' && simulationPhase >= 3 && simulationResult && timelineStage >= 5) {
        if (simulationResult.mitigation_corridors && simulationResult.mitigation_corridors.length > 0) {
          // 1. Glow Layer (wide, low opacity, pulsing)
          layers.push(
            new PathLayer({
              id: 'mitigation-corridors-glow',
              data: simulationResult.mitigation_corridors,
              getPath: (d: any) => d.coordinates,
              getColor: [0, 229, 255, Math.round(40 + Math.sin(pulseRadius * 0.15) * 15)],
              getWidth: (d: any) => {
                const pct = d.flow_allocation_percentage || 50;
                return (2.0 + (pct / 100.0) * 6.0) * 1.8;
              },
              widthMinPixels: 3.5,
              pickable: false,
            })
          );

          // 2. Core Layer (narrow, high opacity)
          layers.push(
            new PathLayer({
              id: 'mitigation-corridors-core',
              data: simulationResult.mitigation_corridors,
              getPath: (d: any) => d.coordinates,
              getColor: [0, 229, 255, 230],
              getWidth: (d: any) => {
                const pct = d.flow_allocation_percentage || 50;
                return 2.0 + (pct / 100.0) * 6.0;
              },
              widthMinPixels: 2.0,
              pickable: true,
            })
          );
        }

        // Feature: Route-Level Rerouting Visualization (Routes A, B, C with 50%/30%/20% allocation)
        if (simulationResult.detour_geometry && simulationResult.detour_geometry.length > 0) {
          // Define route styling: distinct colors and widths for clear visual hierarchy
          const routeStyles = [
            { // Route A (index 0, 50% allocation)
              id_prefix: 'route-a',
              color_glow: [0, 229, 255],     // Bright cyan
              color_core: [0, 229, 255],
              width_core: 8.0,               // Thickest (50%)
              width_glow_multiplier: 1.75,
            },
            { // Route B (index 1, 30% allocation)
              id_prefix: 'route-b',
              color_glow: [0, 176, 212],     // Cyan-blue
              color_core: [0, 176, 212],
              width_core: 5.0,               // Medium (30%)
              width_glow_multiplier: 1.75,
            },
            { // Route C (index 2, 20% allocation)
              id_prefix: 'route-c',
              color_glow: [102, 210, 255],   // Light cyan
              color_core: [102, 210, 255],
              width_core: 3.0,               // Thinnest (20%)
              width_glow_multiplier: 1.75,
            },
          ];

          // Render each route as glow + core layers
          simulationResult.detour_geometry.forEach((route: any, index: number) => {
            if (index < routeStyles.length) {
              const style = routeStyles[index];
              const glowWidth = style.width_core * style.width_glow_multiplier;

              // Glow Layer (wide, pulsing, low opacity)
              layers.push(
                new PathLayer({
                  id: `${style.id_prefix}-glow`,
                  data: [route],
                  getPath: (d: any) => d.coordinates,
                  getColor: [...style.color_glow, Math.round(35 + Math.sin(pulseRadius * 0.15) * 12)],
                  getWidth: glowWidth,
                  widthMinPixels: 3.0,
                  pickable: false,
                })
              );

              // Core Layer (narrow, solid, high opacity)
              layers.push(
                new PathLayer({
                  id: `${style.id_prefix}-core`,
                  data: [route],
                  getPath: (d: any) => d.coordinates,
                  getColor: [...style.color_core, 230],
                  getWidth: style.width_core,
                  widthMinPixels: 2.0,
                  pickable: true,
                })
              );
            }
          });
        }

        if (simulationResult.recovery_corridors && simulationResult.recovery_corridors.length > 0) {
          // 1. Glow Layer (wide, low opacity, pulsing)
          layers.push(
            new PathLayer({
              id: 'recovery-corridors-glow',
              data: simulationResult.recovery_corridors,
              getPath: (d: any) => d.coordinates,
              getColor: [16, 185, 129, Math.round(40 + Math.sin(pulseRadius * 0.15) * 15)],
              getWidth: (d: any) => {
                const score = d.risk_score || 50;
                return (2.0 + (score / 100.0) * 5.0) * 1.8;
              },
              widthMinPixels: 3.5,
              pickable: false,
            })
          );

          // 2. Core Layer (narrow, high opacity)
          layers.push(
            new PathLayer({
              id: 'recovery-corridors-core',
              data: simulationResult.recovery_corridors,
              getPath: (d: any) => d.coordinates,
              getColor: [16, 185, 129, 230],
              getWidth: (d: any) => {
                const score = d.risk_score || 50;
                return 2.0 + (score / 100.0) * 5.0;
              },
              widthMinPixels: 2.0,
              pickable: true,
            })
          );
        }

        // Fallbacks if no corridors are generated
        if ((!simulationResult.mitigation_corridors || simulationResult.mitigation_corridors.length === 0) &&
            (!simulationResult.recovery_corridors || simulationResult.recovery_corridors.length === 0)) {
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

          const recoveryPath = [
            [lng - 0.003, lat - 0.002],
            [lng - 0.001, lat - 0.001]
          ] as [number, number][];

          layers.push(
            new PathLayer({
              id: 'affected-corridor-fallback-red',
              data: [{ path: affectedPath }],
              getPath: (d: any) => d.path,
              getColor: [255, 30, 30, 90],
              getWidth: 1.5,
              widthMinPixels: 1.5,
              pickable: false,
            })
          );

          layers.push(
            new PathLayer({
              id: 'diversion-corridor-fallback-cyan',
              data: [{ path: diversionPath }],
              getPath: (d: any) => d.path,
              getColor: [0, 229, 255, 200],
              getWidth: 4,
              widthMinPixels: 2.5,
              pickable: false,
            })
          );

          layers.push(
            new PathLayer({
              id: 'recovery-corridor-fallback-green',
              data: [{ path: recoveryPath }],
              getPath: (d: any) => d.path,
              getColor: [16, 185, 129, 200],
              getWidth: 4,
              widthMinPixels: 2.5,
              pickable: false,
            })
          );
        }

        if (SHOW_VEHICLES && timelineStage >= 6) {
          // Vehicle animation postponed
        }
      }
    } catch (err: any) {
      console.warn("Alternative routing paths mapping failed:", err);
      if (onLogMessage) {
        onLogMessage(`[WARN] Detour paths compilation error: ${err.message}`, 'warn');
      }
    }
  }

  return (
    <div className="w-full h-full bg-[#050507] relative">
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