import json
import logging
import os
from typing import Optional

import chromadb
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from neo4j.exceptions import DriverError, Neo4jError
from openai import OpenAIError
from pydantic import ValidationError
from pymongo import MongoClient

from graph_store import GraphStore
from llm_extraction import extract_entities
from text_extraction import extract_text
from vector_store import VectorStore

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("storyloom")

app = FastAPI(title="Storyloom Backend")

# CORS middleware (will be useful when we connect frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_clients():
    try:
        chroma = chromadb.HttpClient(
            host=os.getenv("CHROMA_HOST", "chromadb"),
            port=int(os.getenv("CHROMA_PORT", "8000")),
        )
        vector_store = VectorStore(chroma)
    except Exception as e:
        logger.warning("ChromaDB not ready yet: %s", e)
        chroma = None
        vector_store = None

    mongo = MongoClient(os.getenv("MONGO_URI", "mongodb://mongodb:27017"))
    graph = GraphStore()
    return chroma, vector_store, mongo, graph

chroma_client, vector_store, mongo_client, graph_store = get_clients()

@app.on_event("shutdown")
def shutdown_event():
    graph_store.close()

@app.get("/")
def read_root():
    return {"message": "Storyloom Backend API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/health/chromadb")
def chromadb_health():
    try:
        chroma_client.heartbeat()
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.get("/health/mongodb")
def mongodb_health():
    try:
        mongo_client.admin.command("ping")
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.get("/health/neo4j")
def neo4j_health():
    try:
        graph_store.verify_connectivity()
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.get("/api/entities")
def get_entities():
    """Fetch all entities from Neo4j."""
    try:
        entities = graph_store.get_all_entities()
        all_entities = []
        all_entities.extend(entities.get("characters", []))
        all_entities.extend(entities.get("locations", []))
        all_entities.extend(entities.get("plot_threads", []))
        all_entities.extend(entities.get("events", []))
        return {"entities": all_entities, "total": len(all_entities)}
    except Exception as e:
        logger.error("Failed to fetch entities: %s", e, exc_info=True)
        return {"entities": [], "total": 0, "error": str(e)}

@app.post("/ingest")
async def ingest_document(file: UploadFile = File(...), episode: Optional[str] = Form(None)):
    content = await file.read()

    try:
        text = extract_text(file.filename, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not text.strip():
        raise HTTPException(status_code=400, detail="No extractable text found in file")

    episode_name = episode or file.filename

    try:
        result = extract_entities(text, episode_name)
    except (OpenAIError, json.JSONDecodeError, ValidationError) as e:
        logger.error("OpenAI extraction failed for episode=%s: %s", episode_name, e, exc_info=True)
        raise HTTPException(status_code=502, detail=f"OpenAI extraction failed: {e}") from e

    if vector_store is None:
        raise HTTPException(status_code=503, detail="ChromaDB not ready")

    try:
        chunk_ids = vector_store.add_chunks(episode_name, [c.text for c in result.chunks])
    except OpenAIError as e:
        logger.error("Embedding failed for episode=%s: %s", episode_name, e, exc_info=True)
        raise HTTPException(status_code=502, detail=f"Embedding failed: {e}") from e
    except Exception as e:
        logger.error("ChromaDB write failed for episode=%s: %s", episode_name, e, exc_info=True)
        raise HTTPException(status_code=503, detail=f"ChromaDB write failed: {e}") from e

    try:
        total_events = graph_store.store_extraction(result, episode_name, chunk_ids)
    except (Neo4jError, DriverError) as e:
        logger.error("Neo4j write failed for episode=%s: %s", episode_name, e, exc_info=True)
        raise HTTPException(status_code=503, detail=f"Neo4j write failed: {e}") from e

    return {
        "episode": episode_name,
        "chunks_ingested": len(chunk_ids),
        "events_extracted": total_events,
    }
