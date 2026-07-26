#!/bin/bash

# Fresh start - tears down everything including volumes
echo "🔄 Tearing down existing containers and volumes..."
docker-compose down -v

echo "🏗️  Building images..."
docker build -t sl-be ./backend
docker build -t sl-fe ./frontend

echo "🚀 Starting fresh with new database..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 5

echo "✅ Fresh environment ready!"
echo ""
echo "Services:"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "  Neo4j:    http://localhost:7474 (neo4j/password)"
echo "  MongoDB:  mongodb://localhost:27020"
echo ""
docker-compose ps
