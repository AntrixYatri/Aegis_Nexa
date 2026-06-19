from pydantic import BaseModel, Field
from typing import List, Dict, Any

# ---------------------------------------------------------
# INCOMING REQUESTS
# ---------------------------------------------------------

class HistoricalAnalytics(BaseModel):
    risk_score: str
    total_historical_incidents: int
    top_historical_cause: str
    incident_breakdown: Dict[str, int]
    priority_breakdown: Dict[str, int]

class EventSimulationRequest(BaseModel):
    event_type: str = Field(..., description="Type of incident: e.g., VIP Movement, Waterlogging, Protest")
    latitude: float
    longitude: float
    severity: int = Field(default=5, ge=1, le=10)

class DispatchOrderRequest(BaseModel):
    event_type: str
    latitude: float
    longitude: float
    severity: int = Field(default=5, ge=1, le=10)

class ImpactedNode(BaseModel):
    latitude: float
    longitude: float
    risk_score: float

class DetourRoute(BaseModel):
    route_index: int
    flow_allocation_percentage: float
    coordinates: List[List[float]]

# ---------------------------------------------------------
# ENGINEER 1's ROUTING OUTPUT / API RESPONSES
# ---------------------------------------------------------
class EventSimulationResponse(BaseModel):
    status: str
    blast_radius_meters: float
    impacted_nodes: List[ImpactedNode]
    detour_geometry: List[DetourRoute]
    historical_analytics: HistoricalAnalytics

# ---------------------------------------------------------
# ENGINEER 2's INTELLIGENCE OUTPUT
# ---------------------------------------------------------
class DispatchOrder(BaseModel):
    incident_type: str
    action_plan_english: str
    action_plan_kannada: str
    required_personnel: int
    required_barricades: int
