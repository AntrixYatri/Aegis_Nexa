from pydantic import BaseModel, Field
from typing import List, Dict, Any

# ---------------------------------------------------------
# INCOMING REQUESTS
# ---------------------------------------------------------
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

# ---------------------------------------------------------
# ENGINEER 1's ROUTING OUTPUT / API RESPONSES
# ---------------------------------------------------------
class EventSimulationResponse(BaseModel):
    status: str
    blast_radius_meters: float
    impacted_nodes: List[int]
    detour_geometry: List[List[float]]

# ---------------------------------------------------------
# ENGINEER 2's INTELLIGENCE OUTPUT
# ---------------------------------------------------------
class DispatchOrder(BaseModel):
    incident_type: str
    action_plan_english: str
    action_plan_kannada: str
    required_personnel: int
    required_barricades: int

