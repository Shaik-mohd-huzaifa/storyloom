import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone
from typing import Optional

import chromadb
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from neo4j.exceptions import DriverError, Neo4jError
from openai import OpenAIError
from pydantic import ValidationError
from pymongo import MongoClient

import chat_agent
import vector_store
from chunking import chunk_text
from graph_store import GraphStore
from llm_extraction import extract_entities
from schemas import ChatRequest, ChatRunStatus
from text_extraction import extract_text

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

chroma_client = chromadb.HttpClient(
    host=os.getenv("CHROMA_HOST", "chromadb"),
    port=int(os.getenv("CHROMA_PORT", "8000")),
)
mongo_client = MongoClient(os.getenv("MONGO_URI", "mongodb://mongodb:27017"))
graph_store = GraphStore()

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

@app.get("/api/episodes")
def get_episodes():
    """Distinct episodes seen across ingested events."""
    try:
        episodes = graph_store.list_episodes()
        return {"episodes": episodes, "total": len(episodes)}
    except Exception as e:
        logger.error("Failed to fetch episodes: %s", e, exc_info=True)
        return {"episodes": [], "total": 0, "error": str(e)}

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
    chunks = chunk_text(text)

    total_events = 0
    event_offset = 0
    char_cursor = 0
    for idx, chunk in enumerate(chunks):
        try:
            result = extract_entities(chunk, episode_name)
        except (OpenAIError, json.JSONDecodeError, ValidationError) as e:
            logger.error(
                "OpenAI extraction failed for episode=%s chunk=%d/%d: %s",
                episode_name, idx + 1, len(chunks), e, exc_info=True,
            )
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI extraction failed on chunk {idx + 1}/{len(chunks)}: {e}",
            ) from e

        try:
            event_ids = graph_store.store_extraction(result, episode_name, event_offset)
        except (Neo4jError, DriverError) as e:
            logger.error(
                "Neo4j write failed for episode=%s chunk=%d/%d: %s",
                episode_name, idx + 1, len(chunks), e, exc_info=True,
            )
            raise HTTPException(
                status_code=503,
                detail=f"Neo4j write failed on chunk {idx + 1}/{len(chunks)}: {e}",
            ) from e

        try:
            vector_store.index_chunk(
                episode_name, idx, chunk, char_cursor, char_cursor + len(chunk), file.filename,
            )
            vector_store.index_events(episode_name, [
                {
                    "event_id": event_id,
                    "description": e.description,
                    "characters": e.characters,
                    "location": e.location,
                    "plot_thread": e.plot_thread,
                }
                for event_id, e in zip(event_ids, result.events)
            ])
        except Exception as e:
            # Vector indexing is additive (retrieval quality), not the source of truth
            # (Neo4j already has the data) — don't fail the whole ingest over it.
            logger.error(
                "Vector indexing failed for episode=%s chunk=%d/%d: %s",
                episode_name, idx + 1, len(chunks), e, exc_info=True,
            )

        char_cursor += len(chunk)
        total_events += len(event_ids)
        event_offset += len(result.events)

    return {
        "episode": episode_name,
        "chunks_processed": len(chunks),
        "events_extracted": total_events,
    }


# --- Chat (agentic RAG over Neo4j + Chroma) ---

_chat_runs: dict[str, dict] = {}
_chat_runs_lock = threading.Lock()


def _run_chat_agent(run_id: str, request: ChatRequest):
    def on_step(label: str):
        with _chat_runs_lock:
            _chat_runs[run_id]["current_step"] = label

    try:
        result = chat_agent.run(request, graph_store, on_step=on_step)
        message = {
            "id": f"msg-{uuid.uuid4().hex[:8]}",
            "role": "assistant",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **result,
        }
        with _chat_runs_lock:
            _chat_runs[run_id] = {"status": "done", "current_step": None, "message": message, "error": None}
    except Exception as e:
        logger.error("Chat agent run %s failed: %s", run_id, e, exc_info=True)
        with _chat_runs_lock:
            _chat_runs[run_id] = {"status": "error", "current_step": None, "message": None, "error": str(e)}

@app.post("/chat")
def start_chat(request: ChatRequest, background_tasks: BackgroundTasks):
    run_id = uuid.uuid4().hex
    with _chat_runs_lock:
        _chat_runs[run_id] = {"status": "running", "current_step": "STARTING", "message": None, "error": None}
    background_tasks.add_task(_run_chat_agent, run_id, request)
    return {"run_id": run_id}

@app.get("/chat/{run_id}/status", response_model=ChatRunStatus)
def chat_status(run_id: str):
    with _chat_runs_lock:
        run = _chat_runs.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Unknown run_id")
    return ChatRunStatus(run_id=run_id, **run)
