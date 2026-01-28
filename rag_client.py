import aiohttp
import logging
from typing import Dict, Any, Optional

from config import RAG_SERVICE_URL

logger = logging.getLogger(__name__)

class RAGClient:
    """
    Async client for the Daytona RAG Service.
    Handles context retrieval without generation.
    """
    def __init__(self, base_url: str = RAG_SERVICE_URL):
        self.base_url = base_url
    
    async def retrieve(
        self, 
        query: str, 
        context: Optional[Dict[str, Any]] = None,
        history_context: Optional[str] = None,
        language: str = "english"
    ) -> Dict[str, Any]:
        """
        Call the RAG service to retrieve context.
        Returns a dict with relevant_docs, hive_mind_context, etc.
        """
        try:
            # Short timeout to ensure voice latency is low
            # If RAG is too slow, we proceed without context
            timeout = aiohttp.ClientTimeout(total=1.5)
            
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    f"{self.base_url}/api/v1/retrieve",
                    json={
                        "query": query,
                        "context": context or {},
                        "history_context": history_context,
                        "language": language
                    }
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        logger.info(f"✅ RAG Context Retrieved ({len(data.get('relevant_docs', []))} docs)")
                        return data
                    else:
                        logger.error(f"RAG Error: {response.status} - {await response.text()}")
                        return {}
        except Exception as e:
            logger.warning(f"⚠️ RAG retrieval skipped/failed: {e}")
            return {}
