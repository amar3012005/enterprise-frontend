import asyncio
import os
import json
from typing import AsyncGenerator, Optional, Union, Dict, Any, List

from groq import AsyncGroq
from loguru import logger

from line.events import AgentResponse, EndCall, UserTranscriptionReceived, AgentSpeechSent
from line.nodes.conversation_context import ConversationContext
from line.nodes.reasoning import ReasoningNode

from config import DEFAULT_MODEL_ID, DEFAULT_TEMPERATURE, GROQ_API_KEY
from rag_client import RAGClient

class GroqRAGNode(ReasoningNode):
    """
    ReasoningNode that uses RAG pipeline for context and Groq for generation.
    Optimized for DaVinci AI's Tara conversational agent.
    """
    def __init__(
        self,
        system_prompt: str,
        rag_client: Optional[RAGClient] = None,
        model_id: str = DEFAULT_MODEL_ID,
        temperature: float = DEFAULT_TEMPERATURE,
        max_context_length: int = 100,
    ):
        super().__init__(system_prompt=system_prompt, max_context_length=max_context_length)
        
        self.rag_client = rag_client or RAGClient()
        self.model_id = model_id
        if not self.model_id or "gemini" in self.model_id: 
             self.model_id = "llama-3.1-8b-instant"

        self.temperature = temperature
        
        api_key = GROQ_API_KEY or os.environ.get("GROQ_API_KEY")
        if not api_key:
            logger.warning("GROQ_API_KEY not found. Agent will fail to generate.")
            self.groq = None
        else:
            self.groq = AsyncGroq(api_key=api_key)
            
        logger.info(f"GroqRAGNode initialized with model: {self.model_id}")

    async def process_context(
        self, context: ConversationContext
    ) -> AsyncGenerator[Union[AgentResponse, EndCall], None]:
        
        if not context.events:
            return

        # 1. Get User Input
        user_message = context.get_latest_user_transcript_message()
        if not user_message:
            return
            
        logger.info(f'🧠 Processing user message: "{user_message}"')
        
        if not self.groq:
            logger.error("Groq client not initialized")
            yield AgentResponse(content="I'm sorry, I'm having trouble connecting to my brain right now.")
            return

        # 2. Retrieve Context (ONLY retrieving, not generating)
        history_str = self._format_history_for_rag(context)
        
        # Await the RAG client retrieval
        rag_data = await self.rag_client.retrieve(
            query=user_message,
            history_context=history_str
        )
        
        # 3. Construct Prompt
        relevant_docs = rag_data.get("relevant_docs", [])
        hive_mind_context = rag_data.get("hive_mind_context", "")
        web_results = rag_data.get("web_results", "")
        
        # Build context block
        context_block = ""
        
        if hive_mind_context:
            context_block += f"### TEAM KNOWLEDGE (Hive Mind):\n{hive_mind_context}\n\n"

        if relevant_docs:
            context_block += "### RELEVANT KNOWLEDGE:\n"
            for doc in relevant_docs:
                 clean_text = doc.get('text', '').replace('\n', ' ').strip()
                 context_block += f"- {clean_text[:500]}...\n"
            context_block += "\n"
            
        if web_results:
             context_block += f"### WEB SEARCH RESULTS:\n{web_results}\n\n"
        
        # Messages Construction
        messages = [
            {"role": "system", "content": self.system_prompt},
        ]
        
        if context_block:
             messages.append({
                 "role": "system", 
                 "content": f"Relevant Information:\n{context_block}\nUse this information to answer the user if helpful."
             })
             
        # History
        history_messages = self._convert_to_groq_messages(context)
        messages.extend(history_messages)
        
        # 4. Stream Generation
        try:
            stream = await self.groq.chat.completions.create(
                model=self.model_id,
                messages=messages,
                temperature=self.temperature,
                stream=True,
                max_tokens=600
            )
            
            full_response = ""
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    full_response += content
                    yield AgentResponse(content=content)
            
            if full_response:
                logger.info(f'🤖 Agent response: "{full_response}" ({len(full_response)} chars)')
                
                # Simple heuristic for ending calls if the model says goodbye
                # In a real scenario, we'd use tool calling or a classifier
                if "goodbye" in full_response.lower() and len(full_response) < 50:
                    # Only end if it's short and explicitly a goodbye
                     # yield EndCall(goodbye_message=full_response) # Need to check EndCall sig
                     pass 

        except Exception as e:
            logger.error(f"Groq generation failed: {e}")
            yield AgentResponse(content="I'm having a little trouble thinking right now. Could you repeat that?")

    def _convert_to_groq_messages(self, context: ConversationContext) -> List[Dict[str, str]]:
        messages = []
        # Iterate over committed events and map to OpenAI format
        for event in context.get_committed_events():
             # Check distinct types we care about
             if isinstance(event, UserTranscriptionReceived): # or event.type == ...
                 if event.content:
                     messages.append({"role": "user", "content": event.content})
             elif isinstance(event, AgentSpeechSent):
                 if event.content:
                     messages.append({"role": "assistant", "content": event.content})
             # Fallback for generic dict-like access if types differ
             elif hasattr(event, 'type'):
                 if event.type == 'user_transcription_received' and hasattr(event, 'text'):
                     messages.append({"role": "user", "content": event.text})
                 elif event.type == 'agent_speech_sent' and hasattr(event, 'text'):
                     messages.append({"role": "assistant", "content": event.text})
                 
        return messages

    def _format_history_for_rag(self, context: ConversationContext) -> str:
        lines = []
        for event in context.get_committed_events()[-10:]:
             if hasattr(event, 'type'):
                 if event.type == 'user_transcription_received' and hasattr(event, 'text'):
                     lines.append(f"User: {event.text}")
                 elif event.type == 'agent_speech_sent' and hasattr(event, 'text'):
                     lines.append(f"Agent: {event.text}")
        return "\n".join(lines)
