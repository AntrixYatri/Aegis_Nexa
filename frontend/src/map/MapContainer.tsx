import React, { useState, useEffect } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import { ScatterplotLayer, PolygonLayer, ArcLayer } from '@deck.gl/layers';
import { useFleetData } from '../hooks/useFleetData';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapContainerProps {
  simulationPhase: 1 | 2 | 3 | 4;
  activeIncident: {
    event_type: string;
    latitude: number;
    longitude: number;
    severity: number;
    crowd_size?: number;
    duration?: number;
  } | null;
  simulationResult: {
    status: string;
    blast_radius_meters: number;
    impacted_nodes: number[];
    detour_geometry: [number, number][];
  } | null;
  onLogMessage?: (msg: string, type: 'info' | 'warn' | 'critical' | 'success') => void;
}

export default function MapContainer({
  simulationPhase,
  activeIncident,
  simulationResult,
  onLogMessage
}: MapContainerProps) {
  const [time, setTime] = useState(0);

  // Map state
  const [viewState, setViewState] = useState({
    longitude: 77.5946,
    latitude: 12.9716,
    zoom: 12.2,
    pitch: 45,
    bearing: 0
  });

  // Track ticking clock for pulsing animations
  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      setTime((t) => (t + 1) % 100);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  // Update map viewport coordinates when a new active incident is selected
  useEffect(() => {
    if (activeIncident) {
      setViewState((prev) => ({
        ...prev,
        longitude: activeIncident.longitude,
        latitude: activeIncident.latitude,
        zoom: 13.0,
        transitionDuration: 1200
      }));
    }
  }, [activeIncident]);

  // Hook in the logistics fleet tracking simulation
  const { vehicles } = useFleetData(
    activeIncident ? [activeIncident.latitude, activeIncident.longitude] : null,
    simulationPhase >= 3 && simulationResult?.detour_geometry ? simulationResult.detour_geometry : null,
    onLogMessage
  );

  // Construct Deck.gl rendering layers
  const layers: any[] = [];

  if (activeIncident) {
    // 1. Incident beacon pulsing layer
    layers.push(
      new ScatterplotLayer({
        id: 'incident-beacon',
        data: [activeIncident],
        getPosition: (d: any) => [d.longitude, d.latitude],
        getFillColor: [255, 59, 59, 200],
        getRadius: activeIncident.severity * 50,
        radiusMinPixels: 8,
        radiusMaxPixels: 50,
        opacity: (Math.sin(time / 8) + 1) / 2, // Pulse effect
        pickable: true
      })
    );

    // 2. Active Cordon containment polygon (Phase 2+)
    if (simulationPhase >= 2) {
      // Calculate containment boundary box around incident
      const lat = activeIncident.latitude;
      const lng = activeIncident.longitude;
      const offset = 0.005; // ~500m bounding box
      const boundaryPolygon = [
        [lng - offset, lat - offset],
        [lng + offset, lat - offset],
        [lng + offset, lat + offset],
        [lng - offset, lat + offset],
        [lng - offset, lat - offset]
      ];

      layers.push(
        new PolygonLayer({
          id: 'quarantine-boundary',
          data: [{ contour: boundaryPolygon }],
          getPolygon: (d: any) => d.contour,
          getFillColor: [255, 59, 59, 30],
          getLineColor: [255, 59, 59, 255],
          lineWidthMinPixels: 2,
          lineWidthMaxPixels: 6,
          dashJustified: true,
          stroked: true,
          filled: true,
          wireframe: true
        })
      );
    }

    // 3. Green Detour / Corridor Routing arcs (Phase 3+)
    if (simulationPhase >= 3 && simulationResult?.detour_geometry) {
      const sourceCoords = [activeIncident.longitude, activeIncident.latitude];
      const arcsData = simulationResult.detour_geometry.map((pt, idx) => ({
        id: `detour-${idx}`,
        source: sourceCoords,
        target: pt,
        volume: 60 - idx * 15
      }));

      layers.push(
        new ArcLayer({
          id: 'detour-routing-arcs',
          data: arcsData,
          getSourcePosition: (d: any) => d.source,
          getTargetPosition: (d: any) => d.target,
          getSourceColor: [0, 255, 136, 180],
          getTargetColor: [0, 229, 255, 255],
          getWidth: (d: any) => d.volume / 8,
          opacity: (Math.sin(time / 10) + 1) / 2
        })
      );
    }
  }

  // 4. Flipkart Fleet vehicle nodes
  if (vehicles && vehicles.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: 'fleet-vehicles',
        data: vehicles,
        getPosition: (d: any) => d.coordinates,
        getFillColor: (d: any) => {
          if (d.status === 'delayed') return [255, 59, 59, 230]; // Danger Red
          if (d.status === 'rerouted') return [0, 255, 136, 230]; // Success Green
          return [0, 229, 255, 230]; // Ambient Cyan
        },
        getRadius: 25,
        radiusMinPixels: 4,
        radiusMaxPixels: 10,
        pickable: true
      })
    );
  }

  return (
    <div className="relative w-full h-full bg-[#050507]">
      <DeckGL
        viewState={viewState}
        onViewStateChange={(e: any) => setViewState(e.viewState)}
        controller={true}
        layers={layers}
      >
        <Map
          mapLib={import('maplibre-gl')}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          reuseMaps
        />
      </DeckGL>

      {/* Floating Basemap Provider configuration tag */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end space-y-1 pointer-events-none select-none">
        <div className="flex items-center space-x-1.5 border border-cyan-500/30 bg-black/90 px-2 py-1 rounded-none shadow-[0_0_10px_rgba(0,229,255,0.1)]">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-none animate-pulse" />
          <span className="text-[9px] font-bold text-cyan-400 tracking-wider font-mono">MAPLIBRE BASEMAP ACTIVE</span>
        </div>
      </div>
    </div>
  );
}