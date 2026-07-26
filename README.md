# Storyloom

A multi-service project with FastAPI backend, Next.js frontend, and Neo4j graph database.

## Project Structure

```
storyloom/
├── docker-compose.yml     # Docker Compose configuration
├── backend/               # FastAPI backend service
│   └── main.py           # FastAPI application
├── frontend/              # Next.js frontend service
│   ├── package.json
│   ├── next.config.js
│   └── pages/
│       └── index.js
└── README.md
```

## Services

### Backend (FastAPI)
- **Port**: 8000
- **URL**: http://localhost:8000
- **Health Check**: http://localhost:8000/health

### Frontend (Next.js)
- **Port**: 3000
- **URL**: http://localhost:3000

### Neo4j (Graph Database)
- **Bolt Port**: 7687
- **HTTP Port**: 7474
- **HTTPS Port**: 7473
- **URL**: http://localhost:7474
- **Default Credentials**: neo4j / password

### ChromaDB (Vector Database)
- **Port**: 8001 (mapped from container port 8000)
- **URL**: http://localhost:8001

### MongoDB (Document Database)
- **Port**: 27020 (mapped from container port 27017)
- **URI**: mongodb://localhost:27020

## Getting Started

### Prerequisites
- Docker
- Docker Compose

### Running the Services

Start all services:
```bash
docker-compose up
```

Start in detached mode:
```bash
docker-compose up -d
```

View logs:
```bash
docker-compose logs -f
```

Stop services:
```bash
docker-compose down
```

### Service Endpoints

- **Backend API**: http://localhost:8000
- **Backend Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **Neo4j Browser**: http://localhost:7474

## Ingestion Pipeline

`POST /ingest` (multipart form) accepts a `.txt`, `.pdf`, or `.docx` file plus an optional
`episode` field. It:

1. Extracts raw text from the file.
2. Splits the text into chunks.
3. Sends each chunk to an LLM (OpenAI) to extract characters, locations, plot threads,
   events, and character relationships as structured JSON.
4. Upserts the extracted entities into Neo4j using this schema:
   - Nodes: `Character`, `Location`, `Event`, `PlotThread`
   - Edges: `APPEARS_IN`, `RELATED_TO`, `OCCURS_AT`, `PART_OF`, `FOLLOWS` (chronological
     ordering between events from the same source)

### Setup

Copy `.env.example` to `.env` at the project root and set your OpenAI key:

```bash
cp .env.example .env
```

Then set `OPENAI_API_KEY=sk-...` in that `.env` file. Docker Compose loads it
automatically and passes it through to the backend container.

### Example

```bash
curl -X POST http://localhost:8000/ingest \
  -F "file=@episode1.pdf" \
  -F "episode=Episode 1"
```

## Notes

- Services are currently running independently aside from the backend's connections to
  Neo4j, ChromaDB, and MongoDB.
- Vector store ingestion (ChromaDB) and the retrieval agent are not wired up yet — this
  pipeline currently only populates the Neo4j knowledge graph.
