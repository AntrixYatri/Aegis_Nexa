import { ArcLayer, PolygonLayer } from '@deck.gl/layers';

const DETOUR_ROUTES = [
  { source: [77.5946, 12.9716], target: [77.6046, 12.9786], volume: 80 }, // Heavy Flow
  { source: [77.5946, 12.9716], target: [77.5846, 12.9656], volume: 40 }, // Medium Flow
  { source: [77.5946, 12.9716], target: [77.5996, 12.9616], volume: 20 }, // Light Flow
];

const QUARANTINE_ZONE = [
  {
    contour: [
      [77.5900, 12.9700],
      [77.6000, 12.9700],
      [77.6000, 12.9750],
      [77.5900, 12.9750],
    ]
  }
];

interface DeckGlOverlayProps {
  simulationPhase: number;
  time: number;
}

export default function DeckGlOverlay({ simulationPhase, time }: DeckGlOverlayProps) {
  const layers = [];

  // Phase 2 & above: Render the red vulnerability zone
  if (simulationPhase >= 2) {
    layers.push(
      new PolygonLayer({
        id: 'quarantine-zone',
        data: QUARANTINE_ZONE,
        pickable: true,
        stroked: true,
        filled: true,
        wireframe: true,
        lineWidthMinPixels: 2,
        getPolygon: (d: any) => d.contour,
        getFillColor: [239, 68, 68, 40], // Translucent Red
        getLineColor: [239, 68, 68, 255],
        getLineWidth: 5,
      })
    );
  }

  // Phase 3 & above: Shoot the glowing green hydraulic arcs
  if (simulationPhase >= 3) {
    layers.push(
      new ArcLayer({
        id: 'hydraulic-detours',
        data: DETOUR_ROUTES,
        getSourcePosition: (d: any) => d.source,
        getTargetPosition: (d: any) => d.target,
        getSourceColor: [52, 211, 153, 200], // Emerald
        getTargetColor: [16, 185, 129, 255],
        getWidth: (d: any) => d.volume / 10,
        opacity: (Math.sin(time / 10) + 1) / 2, // The pulsing shader logic
      })
    );
  }

  return layers; // Just return the raw array to the GPU
}