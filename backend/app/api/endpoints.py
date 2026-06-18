from fastapi import APIRouter, HTTPException
from app.models.schemas import EventSimulationRequest, EventSimulationResponse, DispatchOrderRequest
from app.services.llm_service import IntelligenceService
from app.services.graph_service import GraphEngine
import datetime
import random

router = APIRouter()

# Instantiate and warm up the cache engine on backend initialization
# Downloads or loads the local Bengaluru 3km UTM-projected OSMnx graph slice
graph_engine = GraphEngine()

@router.post("/simulate-event", response_model=EventSimulationResponse)
async def simulate_event(payload: EventSimulationRequest):
    # Business rule: Reject simulation requests coordinates outside of Karnataka boundaries
    if not (11.0 <= payload.latitude <= 15.0) or not (74.0 <= payload.longitude <= 79.0):
        raise HTTPException(status_code=400, detail="Coordinates outside system geographical boundaries.")

    try:
        # Pass real-time dashboard inputs directly into the network-theory causal engine
        simulation_results = graph_engine.calculate_hydraulic_diversion(
            event_lat=payload.latitude,
            event_lng=payload.longitude,
            severity=payload.severity
        )
        
        # Guardrail check against broken graph partitions
        if not simulation_results["detour_geometry"]:
            raise HTTPException(
                status_code=500, 
                detail="Graph partition failure: Local routing nodes unreachable."
            )
            
        return {
            "status": "success",
            "blast_radius_meters": simulation_results["blast_radius_meters"],
            "impacted_nodes": simulation_results["congested_nodes"],
            "detour_geometry": simulation_results["detour_geometry"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Engine Block Core Fault: {str(e)}")

@router.post("/dispatch-orders")
async def get_dispatch_orders(payload: DispatchOrderRequest):
    # Route generation straight into the intelligence layer service
    orders = IntelligenceService.generate_dispatch_orders(payload.event_type, payload.severity)
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