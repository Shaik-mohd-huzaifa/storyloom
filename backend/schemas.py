from typing import List, Literal, Optional

from pydantic import BaseModel


class CharacterEntity(BaseModel):
    name: str
    traits: Optional[str] = None
    voice_tone: Optional[str] = None
    status: Optional[str] = None


class LocationEntity(BaseModel):
    name: str


class PlotThreadEntity(BaseModel):
    name: str
    status: Optional[str] = None


class EventEntity(BaseModel):
    description: str
    characters: List[str] = []
    location: Optional[str] = None
    plot_thread: Optional[str] = None


class RelationshipEdge(BaseModel):
    character_a: str
    character_b: str
    relation_type: str


class ChunkEntity(BaseModel):
    text: str
    characters: List[str] = []
    locations: List[str] = []
    plot_threads: List[str] = []
    event_indices: List[int] = []


class ExtractionResult(BaseModel):
    characters: List[CharacterEntity] = []
    locations: List[LocationEntity] = []
    plot_threads: List[PlotThreadEntity] = []
    events: List[EventEntity] = []
    relationships: List[RelationshipEdge] = []
    chunks: List[ChunkEntity] = []


# --- Chat / agent models ---

class Citation(BaseModel):
    text: str
    episode: Optional[str] = None
    event_id: Optional[str] = None
    chunk_id: Optional[str] = None


class ChatHistoryTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    mode: Literal["ask", "ideate"] = "ask"
    context_chips: List[str] = []
    episode: Optional[str] = None
    n_options: Optional[int] = None
    cursor_context: Optional[str] = None
    history: List[ChatHistoryTurn] = []


class ChatAction(BaseModel):
    type: Literal["insert", "rewrite"] = "insert"
    label: str = "Insert into scene"
    text: str = ""


class ChatOption(BaseModel):
    id: str
    label: str
    text: str
    rationale: str = ""
    cites: List[Citation] = []
    action: ChatAction


class ChatMessageResponse(BaseModel):
    id: str
    role: Literal["assistant"] = "assistant"
    label: str
    text: str
    cites: List[Citation] = []
    actions: List[ChatAction] = []
    options: List[ChatOption] = []
    needs_clarification: bool = False
    timestamp: str


class ChatRunStatus(BaseModel):
    run_id: str
    status: Literal["running", "done", "error"]
    current_step: Optional[str] = None
    error: Optional[str] = None
    message: Optional[ChatMessageResponse] = None
