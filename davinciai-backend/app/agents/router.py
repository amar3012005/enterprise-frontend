from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db, Agent
import json

router = APIRouter()

# ============= MOCK DATA =============

# Removed MOCK DATA

# ============= RESPONSE MODELS =============

class AgentDetailResponse(BaseModel):
    agent_id: str
    agent_name: str
    cartesia_agent_id: Optional[str] = None
    language_primary: str
    language_secondary: Optional[str] = None
    websocket_url: Optional[str] = None
    location: Optional[str] = None
    created_at: Optional[datetime] = None
    is_active: bool
    configuration: dict

# ============= ROUTES =============

@router.get("/{agent_id}", response_model=AgentDetailResponse)
async def get_agent_details(agent_id: str, db: AsyncSession = Depends(get_db)):
    """Get detailed information about a specific agent"""
    result = await db.execute(select(Agent).where(Agent.agent_id == agent_id))
    agent = result.scalars().first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    config = {}
    if agent.configuration:
        try:
            config = json.loads(agent.configuration)
        except json.JSONDecodeError:
            config = {}

    return {
        "agent_id": agent.agent_id,
        "agent_name": agent.agent_name,
        "agent_description": agent.agent_description,
        "cartesia_agent_id": agent.cartesia_agent_id,
        "language_primary": agent.language_primary,
        "language_secondary": agent.language_secondary,
        "websocket_url": agent.websocket_url,
        "location": agent.location,
        "configuration": config,
        "is_active": agent.is_active,
        "created_at": agent.created_at
    }

