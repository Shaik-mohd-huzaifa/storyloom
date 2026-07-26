#!/bin/bash

# Bring up with existing database
echo "🚀 Starting with existing database..."
docker-compose up -d

echo "⏳ Waiting for services..."
sleep 3

echo "✅ Environment up!"
echo ""
echo "Services:"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "  Neo4j:    http://localhost:7474 (neo4j/password)"
echo "  MongoDB:  mongodb://localhost:27020"
echo ""
docker-compose ps
