from fastapi import APIRouter, HTTPException
from app.models.schemas import EventSimulationRequest, EventSimulationResponse, DispatchOrderRequest
from app.services.llm_service import IntelligenceService
import random

router = APIRouter()

@router.post("/simulate-event", response_model=EventSimulationResponse)
async def simulate_event(payload: EventSimulationRequest):
    # Business rule: Reject simulation requests coordinates outside of Karnataka boundaries
    if not (11.0 <= payload.latitude <= 15.0) or not (74.0 <= payload.longitude <= 79.0):
        raise HTTPException(status_code=400, detail="Coordinates outside system geographical boundaries.")

    # Calculate dynamic mock parameters based on payload inputs
    calculated_radius = float(payload.severity * 150) # Blast radius in meters
    
    # Mocking node IDs from the underlying OSMnx graph network
    congested_nodes = [random.randint(100000, 999999) for _ in range(int(payload.severity))]
    
    # Structural mock coordinate tracking for frontend mapping canvas lines
    mock_detours = [
        [payload.longitude + 0.002, payload.latitude + 0.002],
        [payload.longitude + 0.004, payload.latitude - 0.001],
        [payload.longitude - 0.001, payload.latitude - 0.003]
    ]

    return {
        "status": "success",
        "blast_radius_meters": calculated_radius,
        "impacted_nodes": congested_nodes,
        "detour_geometry": mock_detours
    }

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



