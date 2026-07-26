from typing import List, Optional

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


class ExtractionResult(BaseModel):
    characters: List[CharacterEntity] = []
    locations: List[LocationEntity] = []
    plot_threads: List[PlotThreadEntity] = []
    events: List[EventEntity] = []
    relationships: List[RelationshipEdge] = []
