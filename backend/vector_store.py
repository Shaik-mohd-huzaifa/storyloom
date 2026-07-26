import os

import chromadb

from openai_client import get_client

EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

_chroma_client = None
_collections = {}


def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.HttpClient(
            host=os.getenv("CHROMA_HOST", "chromadb"),
            port=int(os.getenv("CHROMA_PORT", "8000")),
        )
    return _chroma_client


def _collection(name: str):
    if name not in _collections:
        _collections[name] = get_chroma_client().get_or_create_collection(name)
    return _collections[name]


def _embed(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    client = get_client()
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


def index_chunk(episode: str, idx: int, text: str, char_start: int, char_end: int, filename: str):
    doc_id = f"{episode}::chunk::{idx}"
    embedding = _embed([text])[0]
    _collection("story_chunks").upsert(
        ids=[doc_id],
        embeddings=[embedding],
        documents=[text],
        metadatas=[{
            "episode": episode,
            "chunk_index": idx,
            "char_start": char_start,
            "char_end": char_end,
            "filename": filename,
        }],
    )
    return doc_id


def index_events(episode: str, events: list[dict]):
    """events: list of {event_id, description, characters, location, plot_thread}"""
    if not events:
        return []
    descriptions = [e["description"] for e in events]
    embeddings = _embed(descriptions)
    _collection("story_events").upsert(
        ids=[e["event_id"] for e in events],
        embeddings=embeddings,
        documents=descriptions,
        metadatas=[
            {
                "episode": episode,
                "event_id": e["event_id"],
                "characters": ", ".join(e.get("characters") or []),
                "location": e.get("location") or "",
                "plot_thread": e.get("plot_thread") or "",
            }
            for e in events
        ],
    )
    return [e["event_id"] for e in events]


def query(collection_name: str, query_text: str, n_results: int = 5, where: dict = None):
    embedding = _embed([query_text])[0]
    collection = _collection(collection_name)
    count = collection.count()
    if count == 0:
        return []
    result = collection.query(
        query_embeddings=[embedding],
        n_results=min(n_results, count),
        where=where,
    )
    hits = []
    ids = result.get("ids", [[]])[0]
    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]
    for i in range(len(ids)):
        hits.append({
            "id": ids[i],
            "document": documents[i],
            "metadata": metadatas[i],
            "distance": distances[i] if i < len(distances) else None,
        })
    return hits
