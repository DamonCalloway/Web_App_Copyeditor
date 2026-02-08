"""
RAG (Retrieval-Augmented Generation) Module using AWS Bedrock Titan Embeddings

Implements contextual retrieval:
1. Document chunking with overlap
2. Embeddings via AWS Bedrock Titan (no heavy local dependencies)
3. Embeddings stored in MongoDB for persistence
4. Hybrid search (semantic + keyword)
"""

import os
import re
import json
import hashlib
import logging
from typing import List, Dict, Any, Optional, Tuple
import boto3
from motor.motor_asyncio import AsyncIOMotorDatabase
import numpy as np

logger = logging.getLogger(__name__)

# Chunk configuration
CHUNK_SIZE = 400  # approximate words per chunk
CHUNK_OVERLAP = 50  # overlapping words between chunks
TOP_K_RESULTS = 5  # Number of chunks to retrieve

# Bedrock client (lazy initialized)
_bedrock_client = None

def get_bedrock_client():
    """Get or create Bedrock runtime client"""
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client(
            'bedrock-runtime',
            region_name=os.environ.get('AWS_REGION', 'us-east-1'),
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
        )
    return _bedrock_client


def count_words(text: str) -> int:
    """Count words in text (simple approximation for chunking)"""
    return len(text.split())


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks of approximately chunk_size words.
    Returns list of chunk dicts with text and metadata.
    """
    if not text or not text.strip():
        return []
    
    # Split by paragraphs first to maintain coherence
    paragraphs = re.split(r'\n\s*\n', text)
    
    chunks = []
    current_chunk = []
    current_words = 0
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
            
        para_words = count_words(para)
        
        # If single paragraph is too large, split by sentences
        if para_words > chunk_size:
            sentences = re.split(r'(?<=[.!?])\s+', para)
            for sent in sentences:
                sent_words = count_words(sent)
                if current_words + sent_words > chunk_size and current_chunk:
                    # Save current chunk
                    chunk_text_str = ' '.join(current_chunk)
                    chunks.append({
                        "text": chunk_text_str,
                        "word_count": count_words(chunk_text_str),
                        "chunk_index": len(chunks)
                    })
                    # Keep overlap
                    overlap_text = ' '.join(current_chunk[-2:]) if len(current_chunk) > 2 else ''
                    current_chunk = [overlap_text] if overlap_text else []
                    current_words = count_words(overlap_text) if overlap_text else 0
                
                current_chunk.append(sent)
                current_words += sent_words
        else:
            if current_words + para_words > chunk_size and current_chunk:
                # Save current chunk
                chunk_text_str = '\n\n'.join(current_chunk)
                chunks.append({
                    "text": chunk_text_str,
                    "word_count": count_words(chunk_text_str),
                    "chunk_index": len(chunks)
                })
                # Keep some overlap
                if current_chunk:
                    overlap_text = current_chunk[-1] if len(current_chunk[-1]) < 200 else ''
                    current_chunk = [overlap_text] if overlap_text else []
                    current_words = count_words(overlap_text) if overlap_text else 0
                else:
                    current_chunk = []
                    current_words = 0
            
            current_chunk.append(para)
            current_words += para_words
    
    # Don't forget the last chunk
    if current_chunk:
        chunk_text_str = '\n\n'.join(current_chunk)
        chunks.append({
            "text": chunk_text_str,
            "word_count": count_words(chunk_text_str),
            "chunk_index": len(chunks)
        })
    
    return chunks


async def get_bedrock_embedding(text: str) -> List[float]:
    """Get embedding for text using AWS Bedrock Titan Embeddings"""
    try:
        client = get_bedrock_client()
        
        # Truncate text if too long (Titan has input limits)
        text = text[:8000]
        
        # Call Bedrock Titan Embeddings
        response = client.invoke_model(
            modelId='amazon.titan-embed-text-v2:0',
            contentType='application/json',
            accept='application/json',
            body=json.dumps({
                "inputText": text,
                "dimensions": 512,  # Smaller dimension for efficiency
                "normalize": True
            })
        )
        
        result = json.loads(response['body'].read())
        return result.get('embedding', [])
        
    except Exception as e:
        logger.error(f"Error getting Bedrock embedding: {e}")
        return []


async def get_bedrock_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Get embeddings for multiple texts (sequential calls to Bedrock)"""
    embeddings = []
    for text in texts:
        embedding = await get_bedrock_embedding(text)
        embeddings.append(embedding)
    return embeddings


def compute_content_hash(content: str) -> str:
    """Compute hash of content for deduplication"""
    return hashlib.md5(content.encode()).hexdigest()


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two vectors"""
    if not vec1 or not vec2:
        return 0.0
    
    a = np.array(vec1)
    b = np.array(vec2)
    
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return float(dot_product / (norm_a * norm_b))


def compute_keyword_scores(query: str, chunks: List[Dict]) -> List[float]:
    """Compute simple keyword matching scores"""
    if not chunks:
        return []
    
    # Simple keyword matching (TF-IDF-like without sklearn)
    query_words = set(query.lower().split())
    scores = []
    
    for chunk in chunks:
        chunk_text = chunk.get("text", "").lower()
        chunk_words = set(chunk_text.split())
        
        # Calculate overlap
        overlap = query_words.intersection(chunk_words)
        if not query_words:
            scores.append(0.0)
        else:
            # Simple Jaccard-like score
            score = len(overlap) / len(query_words)
            scores.append(score)
    
    return scores


class RAGIndex:
    """
    RAG Index for a project's knowledge base.
    Uses AWS Bedrock Titan for embeddings, stores in MongoDB.
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
        api_key: str = None  # Not used, kept for interface compatibility
    ) -> int:
        """
        Index a document by chunking and creating embeddings.
        Returns number of chunks created.
        """
        if not content or not content.strip():
            return 0
        
        # Check if already indexed (by content hash)
        content_hash = compute_content_hash(content)
        existing = await self.collection.find_one({
            "project_id": self.project_id,
            "file_id": file_id,
            "content_hash": content_hash
        })
        
        if existing:
            logger.info(f"Document {filename} already indexed (hash match)")
            return 0
        
        # Remove old chunks for this file
        await self.collection.delete_many({
            "project_id": self.project_id,
            "file_id": file_id
        })
        
        # Create contextual prefix for chunks
        doc_context = f"From document '{filename}':"
        
        # Chunk the document
        chunks = chunk_text(content)
        
        if not chunks:
            return 0
        
        logger.info(f"Indexing {len(chunks)} chunks for {filename}")
        
        # Create embeddings for each chunk
        chunk_texts_with_context = [
            f"{doc_context}\n\n{chunk['text']}" for chunk in chunks
        ]
        
        embeddings = await get_bedrock_embeddings_batch(chunk_texts_with_context)
        
        # Store chunks with embeddings in MongoDB
        docs_to_insert = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            if embedding:  # Only store if embedding was successful
                docs_to_insert.append({
                    "project_id": self.project_id,
                    "file_id": file_id,
                    "filename": filename,
                    "content_hash": content_hash,
                    "chunk_index": i,
                    "text": chunk["text"],
                    "text_with_context": chunk_texts_with_context[i],
                    "word_count": chunk["word_count"],
                    "embedding": embedding  # Stored in MongoDB
                })
        
        if docs_to_insert:
            await self.collection.insert_many(docs_to_insert)
            logger.info(f"Indexed {len(docs_to_insert)} chunks for {filename} in MongoDB")
        
        return len(docs_to_insert)
    
    async def remove_document(self, file_id: str):
        """Remove all chunks for a document"""
        result = await self.collection.delete_many({
            "project_id": self.project_id,
            "file_id": file_id
        })
        logger.info(f"Removed {result.deleted_count} chunks for file {file_id}")
        return result.deleted_count
    
    async def search(
        self, 
        query: str, 
        api_key: str = None,  # Not used, kept for interface compatibility
        top_k: int = TOP_K_RESULTS
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant chunks using hybrid search.
        Combines semantic similarity with keyword matching.
        """
        # Get all chunks for this project
        chunks = await self.collection.find(
            {"project_id": self.project_id},
            {"_id": 0}
        ).to_list(1000)
        
        if not chunks:
            logger.debug(f"No chunks found for project {self.project_id}")
            return []
        
        # Get query embedding
        query_embedding = await get_bedrock_embedding(query)
        
        if not query_embedding:
            # Fallback to keyword-only search
            logger.warning("Failed to get query embedding, falling back to keyword search")
            return self._keyword_search(query, chunks, top_k)
        
        # Semantic search
        semantic_scores = []
        for chunk in chunks:
            if chunk.get("embedding"):
                similarity = cosine_similarity(query_embedding, chunk["embedding"])
                semantic_scores.append((chunk, similarity))
            else:
                semantic_scores.append((chunk, 0.0))
        
        # Keyword search scores
        keyword_scores = compute_keyword_scores(query, chunks)
        
        # Combine scores (weighted hybrid)
        combined_scores = []
        for i, (chunk, sem_score) in enumerate(semantic_scores):
            kw_score = keyword_scores[i] if i < len(keyword_scores) else 0.0
            # Weight: 70% semantic, 30% keyword
            combined = 0.7 * sem_score + 0.3 * kw_score
            combined_scores.append((chunk, combined, sem_score, kw_score))
        
        # Sort by combined score
        combined_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return top-k with scores
        results = []
        for chunk, combined, sem, kw in combined_scores[:top_k]:
            results.append({
                "text": chunk["text"],
                "filename": chunk["filename"],
                "chunk_index": chunk["chunk_index"],
                "score": float(combined),
                "semantic_score": float(sem),
                "keyword_score": float(kw)
            })
        
        logger.info(f"Search returned {len(results)} results for query: {query[:50]}...")
        return results
    
    def _keyword_search(
        self, 
        query: str, 
        chunks: List[Dict], 
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Fallback keyword-only search"""
        scores = compute_keyword_scores(query, chunks)
        
        scored_chunks = list(zip(chunks, scores))
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        
        results = []
        for chunk, score in scored_chunks[:top_k]:
            results.append({
                "text": chunk["text"],
                "filename": chunk["filename"],
                "chunk_index": chunk["chunk_index"],
                "score": float(score),
                "semantic_score": 0.0,
                "keyword_score": float(score)
            })
        
        return results
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        total_chunks = await self.collection.count_documents({"project_id": self.project_id})
        
        # Get unique files
        files = await self.collection.distinct("file_id", {"project_id": self.project_id})
        
        return {
            "total_chunks": total_chunks,
            "indexed_files": len(files),
            "project_id": self.project_id,
            "embedding_provider": "bedrock-titan"
        }


async def retrieve_context_for_query(
    db: AsyncIOMotorDatabase,
    project_id: str,
    query: str,
    api_key: str = None,  # Not used, kept for interface compatibility
    max_tokens: int = 4000,
    top_k: int = TOP_K_RESULTS
) -> Tuple[str, List[Dict]]:
    """
    Main function to retrieve relevant context for a query.
    Returns formatted context string and list of sources.
    """
    index = RAGIndex(db, project_id)
    results = await index.search(query, api_key, top_k=top_k)
    
    if not results:
        return "", []
    
    # Build context string, respecting approximate token limit
    # (rough estimate: 1 token ≈ 4 characters)
    context_parts = []
    sources = []
    total_chars = 0
    max_chars = max_tokens * 4
    
    for result in results:
        chunk_chars = len(result["text"])
        if total_chars + chunk_chars > max_chars:
            break
        
        context_parts.append(f"[From: {result['filename']}]\n{result['text']}")
        sources.append({
            "filename": result["filename"],
            "score": result["score"]
        })
        total_chars += chunk_chars
    
    context = "\n\n---\n\n".join(context_parts)
    
    logger.info(f"Retrieved {len(sources)} context chunks ({total_chars} chars) for query")
    return context, sources
    
