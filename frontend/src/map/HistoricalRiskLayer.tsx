import { HeatmapLayer } from '@deck.gl/aggregation-layers';

// Premium AuraOS color range for risk levels (Cyan -> Blue -> Amber -> Red -> Fuchsia)
const COLOR_RANGE = [
  [34, 211, 238],    // Cyan (Low Risk)
  [59, 130, 246],    // Blue (Moderate Risk)
  [245, 158, 11],    // Amber (High Risk)
  [239, 68, 68],     // Red (Severe Risk)
  [217, 70, 239]     // Fuchsia (Critical Risk)
];

export function createHistoricalRiskLayer(data: any[]) {
  return new HeatmapLayer({
    id: 'historical-risk-heatmap',
    data,
    getPosition: (d: any) => [d.longitude, d.latitude],
    getWeight: (d: any) => d.risk_score,
    radiusPixels: 55,         // Soft, clustered spread for 110m resolution bins
    intensity: 1.2,           // Boost colors for visibility
    threshold: 0.02,          // Keep soft edges visible
    colorRange: COLOR_RANGE,
    updateTriggers: {
      getWeight: [data]
    }
  });
}
