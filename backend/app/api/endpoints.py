from fastapi import APIRouter, HTTPException
from app.models.schemas import EventSimulationRequest, EventSimulationResponse, DispatchOrderRequest
from app.services.llm_service import IntelligenceService
from app.services.graph_service import GraphEngine
from app.services.vulnerability_service import VulnerabilityService
import datetime
import random
import os
import pandas as pd
from typing import Dict

router = APIRouter()

# Instantiate and warm up the cache engine on backend initialization
# Downloads or loads the local Bengaluru 3km UTM-projected OSMnx graph slice
graph_engine = GraphEngine()
vulnerability_service = VulnerabilityService()

# Load Astram dataset once for historical analytics queries
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
CSV_PATH = os.path.join(
    BACKEND_DIR, 
    "data", 
    "raw", 
    "Astram event data_anonymized - Astram event data_anonymizedb40ac87.csv"
)

try:
    print(f"[endpoints.py] Loading Astram dataset from {CSV_PATH} for historical queries...")
    df_astram = pd.read_csv(CSV_PATH)
    df_astram['latitude'] = pd.to_numeric(df_astram['latitude'], errors='coerce')
    df_astram['longitude'] = pd.to_numeric(df_astram['longitude'], errors='coerce')
    df_astram = df_astram.dropna(subset=['latitude', 'longitude'])
    print(f"[endpoints.py] Successfully loaded {len(df_astram)} historical records.")
except Exception as e:
    print(f"[endpoints.py] Warning: Could not load Astram dataset: {e}")
    df_astram = pd.DataFrame()

def calculate_historical_stats(lat: float, lng: float) -> dict:
    if df_astram.empty:
        return {
            "risk_score": "low",
            "total_historical_incidents": 0,
            "top_historical_cause": "none",
            "incident_breakdown": {},
            "priority_breakdown": {}
        }
    
    # Filter incidents within ~1.5km bounding box
    delta = 0.015
    mask = (
        (df_astram['latitude'] >= lat - delta) & 
        (df_astram['latitude'] <= lat + delta) & 
        (df_astram['longitude'] >= lng - delta) & 
        (df_astram['longitude'] <= lng + delta)
    )
    nearby = df_astram[mask]
    
    if nearby.empty:
        return {
            "risk_score": "low",
            "total_historical_incidents": 0,
            "top_historical_cause": "none",
            "incident_breakdown": {},
            "priority_breakdown": {}
        }
    
    total_count = len(nearby)
    
    # Resolve top cause
    cause_col = 'event_cause' if 'event_cause' in nearby.columns else 'event_type'
    non_null_causes = nearby[cause_col].dropna()
    if not non_null_causes.empty:
        top_cause = str(non_null_causes.mode().iloc[0])
    else:
        top_cause = "unplanned"
        
    # Incident breakdown
    type_col = 'event_type' if 'event_type' in nearby.columns else 'event_cause'
    type_counts = nearby[type_col].value_counts().to_dict()
    incident_breakdown = {str(k): int(v) for k, v in type_counts.items()}
    
    # Priority breakdown
    priority_counts = nearby['priority'].value_counts().to_dict()
    priority_breakdown = {str(k): int(v) for k, v in priority_counts.items()}
    
    # Map score level based on total density of nearby incidents
    if total_count >= 50:
        risk_level = "critical"
    elif total_count >= 20:
        risk_level = "high"
    elif total_count >= 5:
        risk_level = "moderate"
    else:
        risk_level = "low"
        
    return {
        "risk_score": risk_level,
        "total_historical_incidents": int(total_count),
        "top_historical_cause": str(top_cause),
        "incident_breakdown": incident_breakdown,
        "priority_breakdown": priority_breakdown
    }

@router.post("/simulate-event", response_model=EventSimulationResponse)
async def simulate_event(payload: EventSimulationRequest):
    print("[DEBUG] endpoints.py: Entering simulate_event")
    # Business rule: Reject simulation requests coordinates outside of Karnataka boundaries
    if not (11.0 <= payload.latitude <= 15.0) or not (74.0 <= payload.longitude <= 79.0):
        print("[DEBUG] endpoints.py: Coordinates validation failed")
        raise HTTPException(status_code=400, detail="Coordinates outside system geographical boundaries.")

    try:
        print("[DEBUG] endpoints.py: Calling calculate_hydraulic_diversion")
        # Pass real-time dashboard inputs directly into the network-theory causal engine
        simulation_results = graph_engine.calculate_hydraulic_diversion(
            event_lat=payload.latitude,
            event_lng=payload.longitude,
            severity=payload.severity
        )
        print("[DEBUG] endpoints.py: Finished calculate_hydraulic_diversion successfully")
        
        # Guardrail check against broken graph partitions
        if not simulation_results["detour_geometry"]:
            print("[DEBUG] endpoints.py: Empty detour geometry, raising partition failure")
            raise HTTPException(
                status_code=500, 
                detail="Graph partition failure: Local routing nodes unreachable."
            )
            
        # Calculate historical stats dynamically based on the simulated coordinates
        historical_stats = calculate_historical_stats(payload.latitude, payload.longitude)
        
        print("[DEBUG] endpoints.py: Returning EventSimulationResponse")
        return {
            "status": "success",
            "blast_radius_meters": simulation_results["blast_radius_meters"],
            "impacted_nodes": simulation_results["congested_nodes"],
            "detour_geometry": simulation_results["detour_geometry"],
            "congested_corridors": simulation_results.get("congested_corridors", []),
            "mitigation_corridors": simulation_results.get("mitigation_corridors", []),
            "recovery_corridors": simulation_results.get("recovery_corridors", []),
            "historical_analytics": historical_stats,
            "metrics": simulation_results["metrics"]
        }
        
    except Exception as e:
        print(f"[DEBUG] endpoints.py: Exception caught: {e}")
        raise HTTPException(status_code=500, detail=f"Engine Block Core Fault: {str(e)}")

@router.post("/dispatch-orders")
async def get_dispatch_orders(payload: DispatchOrderRequest):
    print("[DEBUG] endpoints.py: Entering get_dispatch_orders")
    # Route generation straight into the intelligence layer service
    print("[DEBUG] endpoints.py: Calling IntelligenceService.generate_dispatch_orders")
    orders = IntelligenceService.generate_dispatch_orders(payload.event_type, payload.severity)
    print("[DEBUG] endpoints.py: Finished generate_dispatch_orders")
    return {
        "event_metadata": {
            "type": payload.event_type,
            "severity_level": payload.severity,
            "incident_location": [payload.latitude, payload.longitude]
        },
        "intelligence_output": orders
    }

@router.get("/event-quarantine-zones")
async def get_logistics_quarantine_zones(lat: float = 12.9716, lng: float = 77.5946, radius_offset: float = 0.005):
    """
    Returns an operational containment zone as a standardized GeoJSON polygon 
    generated dynamically around the event center. Piped directly to logistics providers.
    """
    # Calculate a rough bounding box square around the event center coordinates
    min_lat = lat - radius_offset
    max_lat = lat + radius_offset
    min_lng = lng - radius_offset
    max_lng = lng + radius_offset

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "zone_status": "LOCKED",
                    "reason": "Dynamic High-Risk Traffic Cordon",
                    "timestamp": datetime.datetime.now().isoformat()
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [min_lng, min_lat],
                        [max_lng, min_lat],
                        [max_lng, max_lat],
                        [min_lng, max_lat],
                        [min_lng, min_lat] # Explicitly close the polygon loop
                    ]]
                }
            }
        ]
    }

@router.get("/historical-risk-map")
async def get_historical_risk_map():
    """
    Returns pre-calculated historical vulnerability hotspots and summary statistics.
    """
    payload = vulnerability_service.get_risk_payload()
    if not payload["hotspots"]:
        raise HTTPException(status_code=500, detail="Vulnerability service cache is uninitialized or empty.")
    return payload