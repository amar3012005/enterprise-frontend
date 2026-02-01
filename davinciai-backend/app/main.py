"""
DaVinci AI Backend - FastAPI Application
Multi-tenant voice agent monitoring platform
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
import sys

# Configure loguru
logger.remove()
logger.add(sys.stdout, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>")

from app.config import settings

# Import routers
from app.auth.router import router as auth_router
from app.tenants.router import router as tenants_router
from app.agents.router import router as agents_router
from app.metrics.router import router as metrics_router
from app.wallet.router import router as wallet_router
from app.webhooks.cartesia import router as webhooks_router

# Include database setup
from app.database import Base, engine

# Create FastAPI app
app = FastAPI(
    title="DaVinci AI Backend",
    description="Multi-tenant voice agent monitoring and billing platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development prototype
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(tenants_router, prefix="/api/tenants", tags=["Tenants"])
app.include_router(agents_router, prefix="/api/agents", tags=["Agents"])
app.include_router(metrics_router, prefix="/api/metrics", tags=["Metrics"])
app.include_router(wallet_router, prefix="/api/wallet", tags=["Wallet & Billing"])
app.include_router(webhooks_router, prefix="/webhooks", tags=["Webhooks"])

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "davinciai-backend"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "DaVinci AI Backend API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
