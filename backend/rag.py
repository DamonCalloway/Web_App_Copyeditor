"""
RAG (Retrieval-Augmented Generation) Module

Implements contextual retrieval following Anthropic's approach:
1. Document chunking with overlap
2. Contextual embeddings using OpenAI
3. Hybrid search (semantic + keyword)
4. Relevance-based retrieval for queries
"""

import os
import re
import hashlib
import tiktoken
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
import httpx

logger = logging.getLogger(__name__)

# Chunk configuration
CHUNK_SIZE = 400  # tokens per chunk
CHUNK_OVERLAP = 50  # overlapping tokens between chunks
EMBEDDING_MODEL = "text-embedding-3-small"
TOP_K_RESULTS = 5  # Number of chunks to retrieve

# Initialize tokenizer for counting tokens
tokenizer = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    """Count tokens in text"""
    return len(tokenizer.encode(text))


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[Dict[str, Any]]:
    """
    Split text into overlapping chunks of approximately chunk_size tokens.
    Returns list of chunk dicts with text and metadata.
    """
    if not text or not text.strip():
        return []
    
    # Split by paragraphs first to maintain coherence
    paragraphs = re.split(r'\n\s*\n', text)
    
    chunks = []
    current_chunk = []
    current_tokens = 0
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
            
        para_tokens = count_tokens(para)
        
        # If single paragraph is too large, split by sentences
        if para_tokens > chunk_size:
            sentences = re.split(r'(?<=[.!?])\s+', para)
            for sent in sentences:
                sent_tokens = count_tokens(sent)
                if current_tokens + sent_tokens > chunk_size and current_chunk:
                    # Save current chunk
                    chunk_text = ' '.join(current_chunk)
                    chunks.append({
                        "text": chunk_text,
                        "token_count": count_tokens(chunk_text),
                        "chunk_index": len(chunks)
                    })
                    # Keep overlap
                    overlap_text = ' '.join(current_chunk[-2:]) if len(current_chunk) > 2 else ''
                    current_chunk = [overlap_text] if overlap_text else []
                    current_tokens = count_tokens(overlap_text) if overlap_text else 0
                
                current_chunk.append(sent)
                current_tokens += sent_tokens
        else:
            if current_tokens + para_tokens > chunk_size and current_chunk:
                # Save current chunk
                chunk_text = '\n\n'.join(current_chunk)
                chunks.append({
                    "text": chunk_text,
                    "token_count": count_tokens(chunk_text),
                    "chunk_index": len(chunks)
                })
                # Keep some overlap
                if current_chunk:
                    overlap_text = current_chunk[-1] if len(current_chunk[-1]) < 200 else ''
                    current_chunk = [overlap_text] if overlap_text else []
                    current_tokens = count_tokens(overlap_text) if overlap_text else 0
                else:
                    current_chunk = []
                    current_tokens = 0
            
            current_chunk.append(para)
            current_tokens += para_tokens
    
    # Don't forget the last chunk
    if current_chunk:
        chunk_text = '\n\n'.join(current_chunk)
        chunks.append({
            "text": chunk_text,
            "token_count": count_tokens(chunk_text),
            "chunk_index": len(chunks)
        })
    
    return chunks


async def get_embedding(text: str, api_key: str) -> List[float]:
    """Get embedding for text using OpenAI API via Emergent proxy"""
    try:
        # Use Emergent proxy for embeddings
        proxy_url = "https://integrations.emergentagent.com/llm/v1/embeddings"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                proxy_url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": EMBEDDING_MODEL,
                    "input": text[:8000]  # Limit input length
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["data"][0]["embedding"]
            else:
                logger.error(f"Embedding API error: {response.status_code} - {response.text}")
                return []
    except Exception as e:
        logger.error(f"Error getting embedding: {e}")
        return []


async def get_embeddings_batch(texts: List[str], api_key: str) -> List[List[float]]:
    """Get embeddings for multiple texts"""
    embeddings = []
    for text in texts:
        emb = await get_embedding(text, api_key)
        embeddings.append(emb)
    return embeddings


def compute_content_hash(content: str) -> str:
    """Compute hash of content for deduplication"""
    return hashlib.md5(content.encode()).hexdigest()


class RAGIndex:
    """
    RAG Index for a project's knowledge base.
    Combines semantic search (embeddings) with keyword search (TF-IDF/BM25-like).
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
            logger.info(f"Document {filename} already indexed")
            return 0
        
        # Remove old chunks for this file
        await self.collection.delete_many({
            "project_id": self.project_id,
            "file_id": file_id
        })
        
        # Create contextual prefix for chunks (following Anthropic's approach)
        doc_context = f"This chunk is from the document '{filename}'."
        
        # Chunk the document
        chunks = chunk_text(content)
        
        if not chunks:
            return 0
        
        # Create embeddings for each chunk
        chunk_texts_with_context = [
            f"{doc_context}\n\n{chunk['text']}" for chunk in chunks
        ]
        
        embeddings = await get_embeddings_batch(chunk_texts_with_context, api_key)
        
        # Store chunks with embeddings
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
                    "token_count": chunk["token_count"],
                    "embedding": embedding
                })
        
        if docs_to_insert:
            await self.collection.insert_many(docs_to_insert)
            logger.info(f"Indexed {len(docs_to_insert)} chunks for {filename}")
        
        return len(docs_to_insert)
    
    async def remove_document(self, file_id: str):
        """Remove all chunks for a document"""
        result = await self.collection.delete_many({
            "project_id": self.project_id,
            "file_id": file_id
        })
        return result.deleted_count
    
    async def search(
        self, 
        query: str, 
        api_key: str, 
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
            return []
        
        # Get query embedding
        query_embedding = await get_embedding(query, api_key)
        
        if not query_embedding:
            # Fallback to keyword-only search
            return await self._keyword_search(query, chunks, top_k)
        
        # Semantic search
        semantic_scores = []
        for chunk in chunks:
            if chunk.get("embedding"):
                similarity = cosine_similarity(
                    [query_embedding], 
                    [chunk["embedding"]]
                )[0][0]
                semantic_scores.append((chunk, similarity))
            else:
                semantic_scores.append((chunk, 0.0))
        
        # Keyword search (TF-IDF based)
        keyword_scores = await self._compute_keyword_scores(query, chunks)
        
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
        
        return results
    
    async def _keyword_search(
        self, 
        query: str, 
        chunks: List[Dict], 
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Fallback keyword-only search using TF-IDF"""
        scores = await self._compute_keyword_scores(query, chunks)
        
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
    
    async def _compute_keyword_scores(
        self, 
        query: str, 
        chunks: List[Dict]
    ) -> List[float]:
        """Compute TF-IDF based keyword similarity scores"""
        if not chunks:
            return []
        
        texts = [chunk["text"] for chunk in chunks]
        texts.append(query)  # Add query as last document
        
        try:
            vectorizer = TfidfVectorizer(
                stop_words='english',
                max_features=5000,
                ngram_range=(1, 2)
            )
            tfidf_matrix = vectorizer.fit_transform(texts)
            
            # Compare query (last) with all chunks
            query_vec = tfidf_matrix[-1]
            chunk_vecs = tfidf_matrix[:-1]
            
            similarities = cosine_similarity(query_vec, chunk_vecs)[0]
            return similarities.tolist()
        except Exception as e:
            logger.error(f"TF-IDF error: {e}")
            return [0.0] * len(chunks)
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        total_chunks = await self.collection.count_documents({"project_id": self.project_id})
        
        # Get unique files
        files = await self.collection.distinct("file_id", {"project_id": self.project_id})
        
        return {
            "total_chunks": total_chunks,
            "indexed_files": len(files),
            "project_id": self.project_id
        }


async def retrieve_context_for_query(
    db: AsyncIOMotorDatabase,
    project_id: str,
    query: str,
    api_key: str,
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
    
    # Build context string, respecting token limit
    context_parts = []
    sources = []
    total_tokens = 0
    
    for result in results:
        chunk_tokens = count_tokens(result["text"])
        if total_tokens + chunk_tokens > max_tokens:
            break
        
        context_parts.append(f"[From: {result['filename']}]\n{result['text']}")
        sources.append({
            "filename": result["filename"],
            "score": result["score"]
        })
        total_tokens += chunk_tokens
    
    context = "\n\n---\n\n".join(context_parts)
    
    return context, sources
