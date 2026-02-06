"""
RAG (Retrieval-Augmented Generation) Module - Lightweight Stub

This is a temporary lightweight version that disables ML-based search
to allow deployment on resource-constrained instances.

The full RAG feature can be re-enabled later by:
1. Building the Docker image on a machine with more resources
2. Pushing to ECR and pulling on EC2
"""

import logging
from typing import List, Dict, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Feature flag - RAG is disabled in this lightweight version
RAG_ENABLED = False


class RAGIndex:
    """
    Lightweight RAG Index stub.
    Maintains the same interface but doesn't perform ML operations.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase, project_id: str):
        self.db = db
        self.project_id = project_id
        self.collection = db.rag_chunks
        
    async def index_document(
        self, 
        file_id: str, 
        filename: str, 
        content: str, 
        api_key: str
    ) -> int:
        """
        Stub: Document indexing is disabled.
        Returns 0 chunks (no indexing performed).
        """
        if not RAG_ENABLED:
            logger.info(f"RAG disabled - skipping indexing for {filename}")
            return 0
        return 0
    
    async def remove_document(self, file_id: str):
        """Remove all chunks for a document (cleanup only)"""
        try:
            result = await self.collection.delete_many({
                "project_id": self.project_id,
                "file_id": file_id
            })
            return result.deleted_count
        except Exception as e:
            logger.warning(f"Error removing document chunks: {e}")
            return 0
    
    async def search(
        self, 
        query: str, 
        api_key: str, 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Stub: Search is disabled.
        Returns empty results.
        """
        if not RAG_ENABLED:
            logger.debug("RAG disabled - search returning empty results")
            return []
        return []
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        return {
            "total_chunks": 0,
            "indexed_files": 0,
            "project_id": self.project_id,
            "rag_enabled": RAG_ENABLED
        }


async def retrieve_context_for_query(
    db: AsyncIOMotorDatabase,
    project_id: str,
    query: str,
    api_key: str,
    max_tokens: int = 4000,
    top_k: int = 5
) -> Tuple[str, List[Dict]]:
    """
    Stub: Context retrieval is disabled.
    Returns empty context and sources.
    """
    if not RAG_ENABLED:
        logger.debug("RAG disabled - no context retrieved")
        return "", []
    return "", []
