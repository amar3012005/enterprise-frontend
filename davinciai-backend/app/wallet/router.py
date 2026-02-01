"""
Wallet Router - PROTOTYPE VERSION WITH MOCK DATA
Manages wallet balance, top-ups, and billing
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List
from datetime import datetime
import sys
sys.path.append('..')
from rules import BILLING_RULES

router = APIRouter()

# ============= MOCK DATA =============

MOCK_WALLETS = {
    "demo-tenant-001": {
        "wallet_id": "wallet-001",
        "tenant_id": "demo-tenant-001",
        "balance_euros": 45.50,
        "currency": "EUR",
        "updated_at": "2026-01-28T16:00:00Z"
    }
}

MOCK_TRANSACTIONS = [
    {
        "transaction_id": "txn-001",
        "type": "topup",
        "amount_euros": 50.00,
        "description": "Top-up via Stripe",
        "created_at": "2026-01-27T10:00:00Z"
    },
    {
        "transaction_id": "txn-002",
        "type": "deduction",
        "amount_euros": -2.00,
        "description": "Call #1234 (3:45 min)",
        "created_at": "2026-01-28T09:15:00Z"
    },
    {
        "transaction_id": "txn-003",
        "type": "deduction",
        "amount_euros": -2.50,
        "description": "Call #1235 (7:22 min)",
        "created_at": "2026-01-28T11:30:00Z"
    }
]

# ============= RESPONSE MODELS =============

class WalletResponse(BaseModel):
    balance_euros: float
    currency: str
    estimated_calls_remaining: int
    balance_status: str

class TransactionResponse(BaseModel):
    transaction_id: str
    type: str
    amount_euros: float
    description: str
    created_at: str

class TopUpRequest(BaseModel):
    amount_euros: float

# ============= ROUTES =============

@router.get("/{tenant_id}", response_model=WalletResponse)
async def get_wallet_balance(tenant_id: str):
    """
    Get wallet balance for a tenant (PROTOTYPE - MOCK DATA)
    """
    wallet = MOCK_WALLETS.get(tenant_id)
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )
    
    balance = wallet["balance_euros"]
    
    return {
        "balance_euros": balance,
        "currency": "EUR",
        "estimated_calls_remaining": BILLING_RULES.get_estimated_calls_remaining(balance),
        "balance_status": BILLING_RULES.get_balance_status(balance)
    }

@router.get("/{tenant_id}/transactions", response_model=List[TransactionResponse])
async def get_transaction_history(tenant_id: str, limit: int = 20):
    """
    Get transaction history for a tenant (PROTOTYPE - MOCK DATA)
    """
    # In production, filter by tenant_id from database
    return MOCK_TRANSACTIONS[:limit]

@router.post("/{tenant_id}/topup")
async def initiate_topup(tenant_id: str, request: TopUpRequest):
    """
    Initiate a wallet top-up (PROTOTYPE - MOCK RESPONSE)
    
    In production:
    - Create Stripe payment intent
    - Return client_secret for frontend
    - Handle webhook confirmation
    """
    
    if request.amount_euros < BILLING_RULES.min_topup_amount_euros:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum top-up is €{BILLING_RULES.min_topup_amount_euros}"
        )
    
    if request.amount_euros > BILLING_RULES.max_topup_amount_euros:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum top-up is €{BILLING_RULES.max_topup_amount_euros}"
        )
    
    # MOCK: In production, create Stripe payment intent
    return {
        "status": "initiated",
        "amount_euros": request.amount_euros,
        "payment_intent_id": "pi_mock123456",
        "client_secret": "pi_mock123456_secret",
        "next_action": "Complete payment on frontend with Stripe Elements"
    }

@router.get("/pricing/display")
async def get_pricing_tiers():
    """Get pricing tiers for display on frontend"""
    from rules import get_pricing_display
    return {
        "tiers": get_pricing_display(),
        "topup_presets": BILLING_RULES.topup_presets_euros
    }
