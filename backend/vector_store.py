import os
from typing import List

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
