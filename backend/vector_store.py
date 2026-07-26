import os
from typing import List, Optional

from openai import OpenAI

COLLECTION_NAME = "story_chunks"

_openai_client = None


def _get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    return _openai_client


class VectorStore:
    def __init__(self, chroma_client):
        self._collection = chroma_client.get_or_create_collection(COLLECTION_NAME)

    def embed(self, texts: List[str]) -> List[List[float]]:
        client = _get_openai_client()
        model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        response = client.embeddings.create(model=model, input=texts)
        return [item.embedding for item in response.data]

    def add_chunks(self, episode: str, texts: List[str]) -> List[str]:
        if not texts:
            return []

        ids = [f"{episode}::chunk::{i}" for i in range(len(texts))]
        embeddings = self.embed(texts)
        self._collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=[{"episode": episode, "chunk_index": i} for i in range(len(texts))],
        )
        return ids

    def query(self, query_text: str, n_results: int = 5, where: Optional[dict] = None) -> List[dict]:
        """Semantic search over ingested chunks — the retrieval half of the store, used by
        the chat agent's search_story_chunks tool."""
        count = self._collection.count()
        if count == 0:
            return []
        embedding = self.embed([query_text])[0]
        result = self._collection.query(
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

    def get_by_ids(self, chunk_ids: List[str]) -> List[dict]:
        """Fetch the verbatim text of specific chunks by ID — used to turn a graph entity's
        chunk_ids (see GraphStore) into exact quotable source text for citations, rather than
        the LLM's paraphrased event description."""
        if not chunk_ids:
            return []
        result = self._collection.get(ids=chunk_ids)
        ids = result.get("ids", [])
        documents = result.get("documents", [])
        metadatas = result.get("metadatas", [])
        return [
            {"id": ids[i], "document": documents[i], "metadata": metadatas[i]}
            for i in range(len(ids))
        ]
