from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="Aegis Nexa: AuraOS Predictive Engine",
    description="Enterprise-grade spatiotemporal traffic isolation and dispatch network routing.",
    version="1.0.0"
)

# Configure CORS for Next.js cross-origin coordination
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach production API routers
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root_health_check():
    return {
        "status": "healthy",
        "system": "AuraOS Core",
        "grid_status": "operational"
    }

