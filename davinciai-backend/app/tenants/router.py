from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db, Tenant, Agent, User

router = APIRouter()

# Removed MOCK DATA

# ============= RESPONSE MODELS =============

class TenantResponse(BaseModel):
    tenant_id: str
    organization_name: str
    subdomain: str
    plan_tier: str
    is_active: bool
    created_at: str

class AgentResponse(BaseModel):
    agent_id: str
    agent_name: str
    agent_description: Optional[str] = None
    language_primary: str
    language_secondary: Optional[str] = None
    websocket_url: Optional[str] = None
    is_active: bool
    stats: Optional[dict] = {"total_calls": 0, "total_minutes": 0, "success_rate": 0.0}

# ============= ROUTES =============

@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: str, db: AsyncSession = Depends(get_db)):
    """Get tenant information"""
    result = await db.execute(select(Tenant).where(Tenant.tenant_id == tenant_id))
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return {
        "tenant_id": tenant.tenant_id,
        "organization_name": tenant.organization_name,
        "subdomain": tenant.subdomain,
        "plan_tier": tenant.plan_tier,
        "is_active": tenant.is_active,
        "created_at": tenant.created_at.isoformat()
    }

@router.get("/{tenant_id}/agents", response_model=List[AgentResponse])
async def list_tenant_agents(tenant_id: str, db: AsyncSession = Depends(get_db)):
    """
    List all agents for a tenant
    """
    # Verify tenant exists
    result = await db.execute(select(Tenant).where(Tenant.tenant_id == tenant_id))
    if not result.scalars().first():
        throw_msg = "Tenant not found"
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=throw_msg
        )
    
    # Filter agents by tenant_id
    result = await db.execute(select(Agent).where(Agent.tenant_id == tenant_id))
    agents = result.scalars().all()
    
    return [
        {
            "agent_id": agent.agent_id,
            "agent_name": agent.agent_name,
            "agent_description": agent.agent_description,
            "language_primary": agent.language_primary,
            "language_secondary": agent.language_secondary,
            "websocket_url": agent.websocket_url,
            "is_active": agent.is_active,
            "stats": {"total_calls": 0, "total_minutes": 0, "success_rate": 0.0}
        }
        for agent in agents
    ]
