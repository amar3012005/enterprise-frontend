"""
Cartesia Webhooks - PROTOTYPE VERSION
Handles incoming webhooks from Cartesia platform
"""

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from loguru import logger
import sys
sys.path.append('../..')
from rules import BILLING_RULES

router = APIRouter()

# ============= RESPONSE MODELS =============

class WebhookResponse(BaseModel):
    status: str
    message: str

# ============= ROUTES =============

@router.post("/cartesia/{agent_id}", response_model=WebhookResponse)
async def handle_cartesia_webhook(agent_id: str, request: Request):
    """
    Handle Cartesia webhook events (PROTOTYPE - LOGGING ONLY)
    
    In production:
    - Verify webhook signature
    - Extract call data
    - Calculate cost using rules.py
    - Deduct from wallet
    - Update database
    - Send WebSocket notification to frontend
    """
    
    try:
        data = await request.json()
        event_type = data.get("type")
        
        logger.info(f"📨 Webhook received: {event_type} for agent {agent_id}")
        
        if event_type == "call_started":
            logger.info(f"📞 Call started: {data.get('request_id')}")
            # In production: Log call start, reserve balance estimate
            
        elif event_type == "call_completed":
            request_id = data.get("request_id")
            body = data.get("body", [])
            
            if body:
                # Calculate duration
                start_ts = body[0].get("start_timestamp", 0)
                end_ts = body[-1].get("end_timestamp", 0)
                duration_seconds = int(end_ts - start_ts)
                
                # Calculate cost
                cost = BILLING_RULES.calculate_call_cost(duration_seconds)
                
                logger.info(
                    f"✅ Call completed: {request_id} | "
                    f"Duration: {duration_seconds}s | Cost: €{cost}"
                )
                
                # In production:
                # - Insert call log into database
                # - Deduct from tenant wallet
                # - Send WebSocket update to dashboard
                
        elif event_type == "call_failed":
            logger.warning(f"❌ Call failed: {data.get('request_id')}")
            # In production: Log failure, no charge
        
        return WebhookResponse(
            status="success",
            message=f"Webhook {event_type} processed"
        )
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
