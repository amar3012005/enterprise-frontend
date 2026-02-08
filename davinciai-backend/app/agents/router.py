from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case
from app.database import get_db, Agent, CallLog
import json

router = APIRouter()

# ============= MOCK DATA =============

# Removed MOCK DATA

# ============= RESPONSE MODELS =============

class AgentDetailResponse(BaseModel):
    agent_id: str
    agent_name: str
    agent_description: Optional[str] = None
    cartesia_agent_id: Optional[str] = None
    language_primary: str
    language_secondary: Optional[str] = None
    websocket_url: Optional[str] = None
    location: Optional[str] = None
    created_at: Optional[datetime] = None
    is_active: bool
    configuration: dict
    
    # Enterprise Fields
    avatar_url: Optional[str] = None
    voice_sample_url: Optional[str] = None
    phone_number: Optional[str] = None
    sip_uri: Optional[str] = None
    cost_per_minute: float = 0.15
    routing_tier: str = "standard"
    
    # Config Objects
    llm_config: Optional[dict] = None
    voice_config: Optional[dict] = None
    flow_config: Optional[dict] = None
    
    stats: Optional[dict] = {"total_calls": 0, "total_minutes": 0, "success_rate": 0.0}

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

    # Fetch real stats from CallLog
    stats_query = select(
        func.count(CallLog.id).label("total_calls"),
        func.sum(CallLog.duration_seconds).label("total_seconds"),
        func.avg(
            case(
                (CallLog.status == "completed", 1.0),
                else_=0.0
            )
        ).label("success_rate")
    ).where(CallLog.agent_id == agent_id)
    
    stats_result = await db.execute(stats_query)
    stats_row = stats_result.first()

    config = {}
    if agent.configuration:
        try:
            config = json.loads(agent.configuration)
        except json.JSONDecodeError:
            config = {}

    # Parse JSON configs safely
    def parse_config(json_str):
        if not json_str: return {}
        try: return json.loads(json_str)
        except: return {}

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
        "created_at": agent.created_at,
        
        # Enterprise Fields
        "avatar_url": agent.avatar_url,
        "voice_sample_url": agent.voice_sample_url,
        "phone_number": agent.phone_number,
        "sip_uri": agent.sip_uri,
        "cost_per_minute": agent.cost_per_minute or 0.15,
        "routing_tier": agent.routing_tier or "standard",
        
        # Parsed Configs
        "llm_config": parse_config(agent.llm_config),
        "voice_config": parse_config(agent.voice_config),
        "flow_config": parse_config(agent.flow_config),
        
        "stats": {
            "total_calls": stats_row.total_calls or 0,
            "total_minutes": round((stats_row.total_seconds or 0) / 60, 1),
            "success_rate": round(stats_row.success_rate or 0.0, 3)
        }
    }

