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

## Notes

- Services are currently running independently
- No inter-service connections configured yet
- All services will start on their first `docker-compose up`
