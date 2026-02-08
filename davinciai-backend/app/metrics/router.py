"""
Metrics Router - PROTOTYPE VERSION WITH MOCK DATA
Provides call metrics, analytics, and real-time data
"""

from fastapi import APIRouter, Query, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import random
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, Agent, CallLog

router = APIRouter()

# ============= MOCK DATA GENERATOR =============

def generate_mock_call_logs(agent_id: str, limit: int = 20) -> List[dict]:
    """Generate realistic mock call logs"""
    logs = []
    base_time = datetime.utcnow()
    
    for i in range(limit):
        # Random duration between 2-15 minutes
        duration = random.randint(120, 900)
        cost = 2.00 if duration <= 300 else (3.50 if duration <= 600 else 5.00)
        
        logs.append({
            "call_id": f"call-{1234 + i}",
            "agent_id": agent_id,
            "start_time": (base_time - timedelta(hours=i*2)).isoformat(),
            "duration_seconds": duration,
            "duration_display": f"{duration // 60}:{duration % 60:02d}",
            "cost_euros": cost,
            "status": "completed" if random.random() > 0.05 else "failed",
            "caller_phone": f"+49 151 {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
            "sentiment_score": round(random.uniform(0.6, 1.0), 2)
        })
    
    return logs

def generate_mock_analytics(agent_id: str) -> dict:
    """Generate mock analytics data"""
    return {
        "total_calls_today": 23,
        "total_minutes_today": 127,
        "total_cost_today": 8.40,
        "success_rate": 0.942,
        "avg_call_duration": 332,
        "active_calls": 3,
        "call_volume_trend": [
            {"hour": "00:00", "calls": 2},
            {"hour": "02:00", "calls": 1},
            {"hour": "04:00", "calls": 0},
            {"hour": "06:00", "calls": 3},
            {"hour": "08:00", "calls": 8},
            {"hour": "10:00", "calls": 15},
            {"hour": "12:00", "calls": 21},
            {"hour": "14:00", "calls": 18},
            {"hour": "16:00", "calls": 23},
        ],
        "cost_breakdown": {
            "0-5_min": {"calls": 89, "cost": 178.00},
            "5-10_min": {"calls": 34, "cost": 119.00},
            "10-15_min": {"calls": 12, "cost": 60.00},
            "15+_min": {"calls": 3, "cost": 21.00}
        }
    }

# ============= RESPONSE MODELS =============

class CallLogResponse(BaseModel):
    call_id: str
    duration_display: str
    cost_euros: float
    status: str
    start_time: str
    sentiment_score: float

class AnalyticsResponse(BaseModel):
    total_calls_today: int
    total_minutes_today: int
    total_cost_today: float
    success_rate: float
    avg_call_duration: int
    active_calls: int
    call_volume_trend: List[dict]
    cost_breakdown: dict

class LiveCallResponse(BaseModel):
    call_id: str
    duration_seconds: int
    estimated_cost: float
    status: str
    sentiment: str

class SessionReport(BaseModel):
    session_id: str
    user_id: str
    agent_name: str
    start_time: float
    end_time: float
    duration_seconds: float
    total_turns: int
    avg_ttft_ms: float
    avg_ttfc_ms: float
    status: str

@router.post("/session-report", status_code=status.HTTP_201_CREATED)
async def receive_session_report(report: SessionReport, db: AsyncSession = Depends(get_db)):
    """
    Direct endpoint for WSS providers to submit a full session summary after disconnect.
    """
    # 1. Identify Agent (lookup by name or internal mapping)
    # For now, we'll assume agent_id is passed or mapped
    # In production, use session_id to lookup active agent record
    
    # 2. Save the log
    new_call = CallLog(
        id=report.session_id,
        agent_id="agent-demo-001", # Should be resolved from session_id lookup
        duration_seconds=int(report.duration_seconds),
        status=report.status,
        ttft_ms=int(report.avg_ttft_ms),
        ttfc_ms=int(report.avg_ttfc_ms),
        cost_euros=(report.duration_seconds / 60) * 0.15,
        start_time=datetime.fromtimestamp(report.start_time),
        end_time=datetime.fromtimestamp(report.end_time)
    )
    
    db.add(new_call)
    await db.commit()
    
    # 3. Trigger Real-time update (e.g., via WebSocket or Redis Pub/Sub)
    # logger.info(f"Broadcast: Call {report.session_id} completed. refreshing frontend.")
    
    return {"status": "processed", "call_id": report.session_id}

@router.get("/calls", response_model=List[CallLogResponse])
async def get_call_logs(
    agent_id: Optional[str] = Query(None),
    limit: int = Query(20, le=100)
):
    """
    Get call logs for an agent (PROTOTYPE - MOCK DATA)
    """
    logs = generate_mock_call_logs(agent_id or "tara-support-001", limit)
    return [
        {
            "call_id": log["call_id"],
            "duration_display": log["duration_display"],
            "cost_euros": log["cost_euros"],
            "status": log["status"],
            "start_time": log["start_time"],
            "sentiment_score": log["sentiment_score"]
        }
        for log in logs
    ]

@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(agent_id: Optional[str] = Query(None)):
    """
    Get aggregated analytics for an agent (PROTOTYPE - MOCK DATA)
    """
    return generate_mock_analytics(agent_id or "tara-support-001")

@router.get("/realtime", response_model=List[LiveCallResponse])
async def get_realtime_calls(agent_id: Optional[str] = Query(None)):
    """
    Get currently active calls (PROTOTYPE - MOCK DATA)
    
    In production, this would be replaced with WebSocket updates
    """
    # Simulate 2-3 active calls
    active_calls = []
    for i in range(random.randint(0, 3)):
        duration = random.randint(30, 180)
        active_calls.append({
            "call_id": f"live-call-{i+1}",
            "duration_seconds": duration,
            "estimated_cost": round(duration / 150 * 2.0, 2),  # Rough estimate
            "status": "agent_speaking" if random.random() > 0.5 else "user_speaking",
            "sentiment": "positive" if random.random() > 0.3 else "neutral"
        })
    
    return active_calls
