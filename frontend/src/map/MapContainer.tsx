import React from 'react';
import Map from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapContainerProps {
  simulationPhase: 1 | 2 | 3 | 4;
  activeIncident: any;
  simulationResult: any;
  onLogMessage?: (
    msg: string,
    type: 'info' | 'warn' | 'critical' | 'success'
  ) => void;
}

export default function MapContainer({
  simulationPhase,
  activeIncident,
  simulationResult,
  onLogMessage
}: MapContainerProps) {
  return (
    <div className="w-full h-full min-h-[350px] md:min-h-[450px] lg:min-h-[500px] xl:min-h-[550px] bg-[#050507]">
      <Map
        onLoad={() => console.log("MAP LOADED")}
        onRender={() => console.log("MAP RENDERING")}
        mapLib={maplibregl}
        initialViewState={{
          longitude: 77.5946,
          latitude: 12.9716,
          zoom: 12.5,
          pitch: 45,
          bearing: -15
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        style={{
          width: "100%",
          height: "100%"
        }}
      />
    </div>
  );
}