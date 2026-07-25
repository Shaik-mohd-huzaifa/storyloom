from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Storyloom Backend")

# CORS middleware (will be useful when we connect frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Storyloom Backend API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
