import os
from typing import Optional

import chromadb
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

from chunking import chunk_text
from graph_store import GraphStore
from llm_extraction import extract_entities
from text_extraction import extract_text

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
    for chunk in chunks:
        result = extract_entities(chunk, episode_name)
        total_events += graph_store.store_extraction(result, episode_name, event_offset)
        event_offset += len(result.events)

    return {
        "episode": episode_name,
        "chunks_processed": len(chunks),
        "events_extracted": total_events,
    }
