import os

from neo4j import GraphDatabase

from schemas import ExtractionResult


class GraphStore:
    def __init__(self):
        self._driver = GraphDatabase.driver(
            os.getenv("NEO4J_URI", "bolt://neo4j:7687"),
            auth=(
                os.getenv("NEO4J_USER", "neo4j"),
                os.getenv("NEO4J_PASSWORD", "password"),
            ),
        )

    def close(self):
        self._driver.close()

    def store_extraction(self, result: ExtractionResult, episode: str, event_offset: int) -> int:
        with self._driver.session() as session:
            session.execute_write(self._write_extraction, result, episode, event_offset)
        return len(result.events)

    @staticmethod
    def _write_extraction(tx, result: ExtractionResult, episode: str, event_offset: int):
        for c in result.characters:
            tx.run(
                """
                MERGE (ch:Character {name: $name})
                SET ch.traits = coalesce($traits, ch.traits),
                    ch.voice_tone = coalesce($voice_tone, ch.voice_tone),
                    ch.status = coalesce($status, ch.status)
                """,
                name=c.name,
                traits=c.traits,
                voice_tone=c.voice_tone,
                status=c.status,
            )

        for l in result.locations:
            tx.run("MERGE (:Location {name: $name})", name=l.name)

        for p in result.plot_threads:
            tx.run(
                """
                MERGE (pt:PlotThread {name: $name})
                SET pt.status = coalesce($status, pt.status)
                """,
                name=p.name,
                status=p.status,
            )

        prev_event_id = None
        for idx, e in enumerate(result.events):
            event_id = f"{episode}::{event_offset + idx}"
            tx.run(
                """
                MERGE (ev:Event {id: $id})
                SET ev.description = $description, ev.episode = $episode
                """,
                id=event_id,
                description=e.description,
                episode=episode,
            )

            for char_name in e.characters:
                tx.run(
                    """
                    MERGE (ch:Character {name: $cname})
                    WITH ch
                    MATCH (ev:Event {id: $eid})
                    MERGE (ch)-[:APPEARS_IN]->(ev)
                    """,
                    cname=char_name,
                    eid=event_id,
                )

            if e.location:
                tx.run(
                    """
                    MERGE (l:Location {name: $lname})
                    WITH l
                    MATCH (ev:Event {id: $eid})
                    MERGE (ev)-[:OCCURS_AT]->(l)
                    """,
                    lname=e.location,
                    eid=event_id,
                )

            if e.plot_thread:
                tx.run(
                    """
                    MERGE (pt:PlotThread {name: $pname})
                    WITH pt
                    MATCH (ev:Event {id: $eid})
                    MERGE (ev)-[:PART_OF]->(pt)
                    """,
                    pname=e.plot_thread,
                    eid=event_id,
                )

            if prev_event_id:
                tx.run(
                    """
                    MATCH (a:Event {id: $prev}), (b:Event {id: $curr})
                    MERGE (a)-[:FOLLOWS]->(b)
                    """,
                    prev=prev_event_id,
                    curr=event_id,
                )

            prev_event_id = event_id

        for r in result.relationships:
            tx.run(
                """
                MERGE (a:Character {name: $a})
                MERGE (b:Character {name: $b})
                MERGE (a)-[rel:RELATED_TO]->(b)
                SET rel.type = $rtype
                """,
                a=r.character_a,
                b=r.character_b,
                rtype=r.relation_type,
            )
